#!/usr/bin/env python3
"""
GARCH Parameter Optimization Script

This script optimizes GARCH(1,1) parameters to match S&P 500 historical data characteristics.
It uses scipy.optimize to find the best parameters that minimize the difference between
simulated and historical statistics.
"""

import json
import math
import random
from typing import List, Tuple, Dict

# Try to import numpy and scipy, but provide fallbacks if not available
try:
    import numpy as np
    from scipy.optimize import minimize
    from scipy.stats import percentileofscore
    HAS_SCIPY = True
except ImportError:
    print("Warning: scipy not available, using simplified optimization")
    HAS_SCIPY = False

def load_sp500_data(file_path: str = "public/data/sp500_returns.json") -> List[float]:
    """Load S&P 500 returns data from JSON file."""
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data['returns']

def calculate_statistics(data: List[float]) -> Dict[str, float]:
    """Calculate key statistics for a dataset."""
    if HAS_SCIPY:
        data_array = np.array(data)
        return {
            'mean': float(np.mean(data_array)),
            'median': float(np.median(data_array)),
            'std': float(np.std(data_array)),
            'p05': float(np.percentile(data_array, 5)),
            'p10': float(np.percentile(data_array, 10)),
            'p25': float(np.percentile(data_array, 25)),
            'p75': float(np.percentile(data_array, 75)),
            'p90': float(np.percentile(data_array, 90)),
            'p95': float(np.percentile(data_array, 95))
        }
    else:
        # Fallback implementation without numpy
        sorted_data = sorted(data)
        n = len(data)
        
        def percentile(p):
            index = int(p * n / 100)
            return sorted_data[min(index, n - 1)]
        
        return {
            'mean': sum(data) / len(data),
            'median': sorted_data[n // 2] if n % 2 == 1 else (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2,
            'std': math.sqrt(sum((x - sum(data) / len(data)) ** 2 for x in data) / len(data)),
            'p05': percentile(5),
            'p10': percentile(10),
            'p25': percentile(25),
            'p75': percentile(75),
            'p90': percentile(90),
            'p95': percentile(95)
        }

def generate_garch_simulation(omega: float, alpha: float, beta: float, drift: float, 
                            initial_variance: float, volatility_scale: float = 1.0, 
                            n_simulations: int = 10000) -> List[float]:
    """
    Generate GARCH(1,1) simulation data.
    
    Parameters:
    - omega: constant term
    - alpha: ARCH parameter
    - beta: GARCH parameter
    - drift: mean return term
    - initial_variance: starting variance
    - volatility_scale: scaling factor for volatility (to match historical std)
    - n_simulations: number of simulations to generate
    
    Returns:
    - List of simulated returns
    """
    garch_data = []
    variance = initial_variance
    
    for i in range(n_simulations):
        # Generate random shock using Box-Muller transform for normal distribution
        u1 = random.random()
        u2 = random.random()
        z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        
        # Apply volatility scaling to control the overall volatility
        shock = z0 * volatility_scale
        
        # Calculate return with drift term
        return_val = drift + shock * math.sqrt(variance)
        garch_data.append(return_val)
        
        # Update variance for next period (GARCH(1,1) equation)
        variance = omega + alpha * (shock ** 2) + beta * variance
        
        # Ensure variance doesn't explode or collapse
        variance = max(0.0001, min(0.01, variance))
    
    return garch_data

def objective_function(params: List[float], target_stats: Dict[str, float], 
                      n_simulations: int = 10000) -> float:
    """
    Objective function for optimization.
    Returns the sum of squared differences between simulated and target statistics.
    """
    omega, alpha, beta, drift, initial_variance, volatility_scale = params
    
    # Generate simulation with current parameters
    simulated_data = generate_garch_simulation(omega, alpha, beta, drift, initial_variance, volatility_scale, n_simulations)
    simulated_stats = calculate_statistics(simulated_data)
    
    # Calculate weighted sum of squared differences - adjusted weights to focus on key metrics
    weights = {
        'mean': 15.0,      # Very high weight for mean
        'median': 12.0,    # Very high weight for median
        'std': 25.0,       # Very high weight for volatility (most important)
        'p05': 8.0,        # High weight for percentiles
        'p10': 8.0,
        'p25': 6.0,
        'p75': 6.0,
        'p90': 8.0,
        'p95': 8.0
    }
    
    total_error = 0
    for stat_name, target_value in target_stats.items():
        if stat_name in simulated_stats:
            error = (simulated_stats[stat_name] - target_value) ** 2
            weight = weights.get(stat_name, 1.0)
            total_error += weight * error
    
    return total_error

def find_volatility_scale(historical_data: List[float], target_std: float, 
                         omega: float, alpha: float, beta: float, drift: float, 
                         initial_variance: float, n_simulations: int = 10000) -> float:
    """
    Find the volatility scaling parameter that matches the target standard deviation.
    """
    def objective_vol_scale(vol_scale):
        simulated_data = generate_garch_simulation(omega, alpha, beta, drift, initial_variance, vol_scale, n_simulations)
        simulated_stats = calculate_statistics(simulated_data)
        return abs(simulated_stats['std'] - target_std)
    
    # Binary search for the best volatility scale
    low, high = 0.1, 3.0
    tolerance = 0.001
    
    while high - low > tolerance:
        mid = (low + high) / 2
        error_mid = objective_vol_scale(mid)
        
        # Test slightly higher and lower values
        error_high = objective_vol_scale(mid + tolerance)
        error_low = objective_vol_scale(mid - tolerance)
        
        if error_low < error_mid and error_low < error_high:
            high = mid
        elif error_high < error_mid and error_high < error_low:
            low = mid
        else:
            break
    
    return (low + high) / 2

def grid_search_optimization(historical_data: List[float], n_simulations: int = 5000) -> Tuple[List[float], float]:
    """
    Grid search optimization for GARCH parameters.
    Used when scipy is not available.
    """
    print("Using grid search optimization (scipy not available)")
    
    target_stats = calculate_statistics(historical_data)
    print("Target Statistics:")
    for stat, value in target_stats.items():
        print(f"  {stat}: {value:.6f}")
    
    # Define parameter ranges for grid search
    omega_range = [0.00005, 0.0001, 0.0002, 0.0005]
    alpha_range = [0.05, 0.08, 0.12, 0.15, 0.20]
    beta_range = [0.80, 0.85, 0.90, 0.92, 0.95]
    drift_range = [0.006, 0.008, 0.010, 0.012]
    initial_variance_range = [0.001, 0.002, 0.003, 0.004]
    volatility_scale_range = [0.8, 0.9, 1.0, 1.1, 1.2] # New parameter for volatility scaling
    
    best_params = None
    best_error = float('inf')
    
    total_combinations = len(omega_range) * len(alpha_range) * len(beta_range) * len(drift_range) * len(initial_variance_range) * len(volatility_scale_range)
    print(f"Testing {total_combinations} parameter combinations...")
    
    count = 0
    for omega in omega_range:
        for alpha in alpha_range:
            for beta in beta_range:
                # Skip if alpha + beta >= 1 (non-stationary)
                if alpha + beta >= 1:
                    continue
                    
                for drift in drift_range:
                    for initial_variance in initial_variance_range:
                        for volatility_scale in volatility_scale_range:
                            params = [omega, alpha, beta, drift, initial_variance, volatility_scale]
                            error = objective_function(params, target_stats, n_simulations)
                            
                            if error < best_error:
                                best_error = error
                                best_params = params
                            
                            count += 1
                            if count % 100 == 0:
                                print(f"Progress: {count}/{total_combinations} combinations tested")
    
    return best_params, best_error

def scipy_optimization(historical_data: List[float], n_simulations: int = 10000) -> Tuple[List[float], Dict]:
    """
    Scipy-based optimization for GARCH parameters.
    """
    print("Using scipy optimization")
    
    target_stats = calculate_statistics(historical_data)
    target_std = target_stats['std']
    
    # Initial parameter guesses - try different starting points
    initial_params = [0.0002, 0.15, 0.80, 0.010, 0.003]
    
    # Parameter bounds - wider ranges for better exploration
    bounds = [
        (0.00001, 0.001),    # omega
        (0.01, 0.4),         # alpha - wider range
        (0.3, 0.99),         # beta - wider range
        (0.005, 0.020),      # drift - wider range
        (0.001, 0.010)       # initial_variance - wider range
    ]
    
    # Additional constraint: alpha + beta < 1 (for stationarity)
    constraints = ({'type': 'ineq', 'fun': lambda x: 1 - x[1] - x[2]})
    
    def objective_with_vol_scale(params):
        omega, alpha, beta, drift, initial_variance = params
        # Find the best volatility scale for these parameters
        vol_scale = find_volatility_scale(historical_data, target_std, omega, alpha, beta, drift, initial_variance, n_simulations)
        # Generate simulation with optimal volatility scale
        simulated_data = generate_garch_simulation(omega, alpha, beta, drift, initial_variance, vol_scale, n_simulations)
        simulated_stats = calculate_statistics(simulated_data)
        
        # Calculate weighted sum of squared differences
        weights = {
            'mean': 15.0,      # Very high weight for mean
            'median': 12.0,    # Very high weight for median
            'p05': 8.0,        # High weight for percentiles
            'p10': 8.0,
            'p25': 6.0,
            'p75': 6.0,
            'p90': 8.0,
            'p95': 8.0
        }
        
        total_error = 0
        for stat_name, target_value in target_stats.items():
            if stat_name in simulated_stats and stat_name != 'std':  # Skip std since we're optimizing it separately
                error = (simulated_stats[stat_name] - target_value) ** 2
                weight = weights.get(stat_name, 1.0)
                total_error += weight * error
        
        return total_error
    
    print(f"Optimizing GARCH parameters with {n_simulations} simulations...")
    print("Initial parameters:", initial_params)
    
    # Run optimization with more iterations
    result = minimize(
        objective_with_vol_scale,
        initial_params,
        method='SLSQP',
        bounds=bounds,
        constraints=constraints,
        options={'maxiter': 100, 'ftol': 1e-6}
    )
    
    # Get the final volatility scale
    omega, alpha, beta, drift, initial_variance = result.x
    final_vol_scale = find_volatility_scale(historical_data, target_std, omega, alpha, beta, drift, initial_variance, n_simulations)
    
    return [omega, alpha, beta, drift, initial_variance, final_vol_scale], result

def optimize_garch_parameters(historical_data: List[float], 
                            n_simulations: int = 10000) -> Tuple[List[float], Dict]:
    """
    Optimize GARCH parameters to match historical data.
    
    Returns:
    - Optimized parameters [omega, alpha, beta, drift, initial_variance]
    - Optimization results
    """
    if HAS_SCIPY:
        optimized_params, optimization_result = scipy_optimization(historical_data, n_simulations)
        return optimized_params, {'success': optimization_result.success, 'fun': optimization_result.fun}
    else:
        optimized_params, best_error = grid_search_optimization(historical_data, n_simulations)
        return optimized_params, {'success': True, 'fun': best_error}

def validate_parameters(params: List[float], historical_data: List[float], 
                       n_simulations: int = 10000) -> Dict:
    """
    Validate optimized parameters by comparing simulated vs historical statistics.
    """
    omega, alpha, beta, drift, initial_variance, volatility_scale = params
    
    print(f"\nValidating optimized parameters:")
    print(f"  omega: {omega:.6f}")
    print(f"  alpha: {alpha:.6f}")
    print(f"  beta: {beta:.6f}")
    print(f"  drift: {drift:.6f}")
    print(f"  initial_variance: {initial_variance:.6f}")
    print(f"  volatility_scale: {volatility_scale:.6f}")
    print(f"  alpha + beta: {alpha + beta:.6f} (should be < 1)")
    
    # Generate simulation with optimized parameters
    simulated_data = generate_garch_simulation(omega, alpha, beta, drift, initial_variance, volatility_scale, n_simulations)
    
    # Calculate statistics for both datasets
    historical_stats = calculate_statistics(historical_data)
    simulated_stats = calculate_statistics(simulated_data)
    
    print(f"\nComparison:")
    print(f"{'Statistic':<12} {'Historical':<12} {'Simulated':<12} {'Difference':<12}")
    print("-" * 50)
    
    for stat in ['mean', 'median', 'std', 'p05', 'p10', 'p25', 'p75', 'p90', 'p95']:
        hist_val = historical_stats[stat]
        sim_val = simulated_stats[stat]
        diff = sim_val - hist_val
        print(f"{stat:<12} {hist_val:<12.6f} {sim_val:<12.6f} {diff:<12.6f}")
    
    return {
        'historical_stats': historical_stats,
        'simulated_stats': simulated_stats,
        'historical_data': historical_data,
        'simulated_data': simulated_data
    }

def main():
    """Main function to run the optimization."""
    print("GARCH Parameter Optimization for S&P 500 Data")
    print("=" * 50)
    
    # Load historical data
    try:
        historical_data = load_sp500_data()
        print(f"Loaded {len(historical_data)} historical data points")
    except FileNotFoundError:
        print("Error: Could not find sp500_returns.json file")
        print("Please ensure the file exists in public/data/")
        return
    
    # Optimize parameters
    optimized_params, optimization_result = optimize_garch_parameters(historical_data)
    
    if optimization_result['success']:
        print(f"\nOptimization successful!")
        print(f"Final objective value: {optimization_result['fun']:.6f}")
    else:
        print(f"\nOptimization failed")
        return
    
    # Validate results
    validation_results = validate_parameters(optimized_params, historical_data)
    
    # Generate JavaScript code
    omega, alpha, beta, drift, initial_variance, volatility_scale = optimized_params
    print(f"\nOptimized JavaScript GARCH Parameters:")
    print(f"const omega = {omega:.6f};        // Constant")
    print(f"const alpha = {alpha:.6f};        // ARCH parameter")
    print(f"const beta = {beta:.6f};         // GARCH parameter")
    print(f"const drift = {drift:.6f};       // Monthly drift term")
    print(f"let variance = {initial_variance:.6f};  // Initial variance")
    print(f"const volatilityScale = {volatility_scale:.6f};  // Volatility scaling factor")
    
    print(f"\nOptimization complete!")

if __name__ == "__main__":
    main() 