#!/usr/bin/env python3
"""
GARCH Parameter Optimization Script

This script optimizes GARCH(3,2) parameters to match S&P 500 historical data characteristics.
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

def generate_garch_simulation(omega: float, alpha1: float, alpha2: float, alpha3: float, 
                            beta1: float, beta2: float, drift: float, 
                            initial_variance: float, volatility_scale: float = 1.0, 
                            n_simulations: int = 10000) -> List[float]:
    """
    Generate GARCH(3,2) simulation data.
    
    Parameters:
    - omega: constant term
    - alpha1, alpha2, alpha3: ARCH parameters (lag 1, 2, 3)
    - beta1, beta2: GARCH parameters (lag 1, 2)
    - drift: mean return term
    - initial_variance: starting variance
    - volatility_scale: scaling factor for volatility (to match historical std)
    - n_simulations: number of simulations to generate
    
    Returns:
    - List of simulated returns
    """
    garch_data = []
    
    # Initialize variance history for GARCH(3,2) - need 3 periods of variance
    variance_history = [initial_variance] * 3
    shock_history = [0.0] * 3  # Initialize shock history
    
    for i in range(n_simulations):
        # Generate random shock using Box-Muller transform for normal distribution
        u1 = random.random()
        u2 = random.random()
        z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        
        # Apply volatility scaling to control the overall volatility
        shock = z0 * volatility_scale
        
        # Calculate return with drift term using current variance
        return_val = drift + shock * math.sqrt(variance_history[-1])
        garch_data.append(return_val)
        
        # Update variance for next period (GARCH(3,2) equation)
        # variance_t = omega + alpha1*shock_{t-1}^2 + alpha2*shock_{t-2}^2 + alpha3*shock_{t-3}^2 + 
        #              beta1*variance_{t-1} + beta2*variance_{t-2}
        new_variance = (omega + 
                       alpha1 * shock_history[-1]**2 + 
                       alpha2 * shock_history[-2]**2 + 
                       alpha3 * shock_history[-3]**2 + 
                       beta1 * variance_history[-1] + 
                       beta2 * variance_history[-2])
        
        # Ensure variance doesn't explode or collapse
        new_variance = max(0.0001, min(0.01, new_variance))
        
        # Update histories
        variance_history.append(new_variance)
        shock_history.append(shock)
        
        # Keep only the last 3 values for memory efficiency
        variance_history = variance_history[-3:]
        shock_history = shock_history[-3:]
    
    return garch_data

def objective_function(params: List[float], target_stats: Dict[str, float], 
                      n_simulations: int = 10000) -> float:
    """
    Objective function for optimization.
    Returns the sum of squared differences between simulated and target statistics.
    """
    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = params
    
    # Generate simulation with current parameters
    simulated_data = generate_garch_simulation(omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale, n_simulations)
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
                         omega: float, alpha1: float, alpha2: float, alpha3: float, 
                         beta1: float, beta2: float, drift: float, 
                         initial_variance: float, n_simulations: int = 10000) -> float:
    """
    Find the volatility scaling parameter that matches the target standard deviation.
    """
    def objective_vol_scale(vol_scale):
        simulated_data = generate_garch_simulation(omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, vol_scale, n_simulations)
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
    alpha1_range = [0.05, 0.08, 0.12, 0.15, 0.20]
    alpha2_range = [0.05, 0.08, 0.12, 0.15, 0.20]
    alpha3_range = [0.05, 0.08, 0.12, 0.15, 0.20]
    beta1_range = [0.80, 0.85, 0.90, 0.92, 0.95]
    beta2_range = [0.80, 0.85, 0.90, 0.92, 0.95]
    drift_range = [0.006, 0.008, 0.010, 0.012]
    initial_variance_range = [0.001, 0.002, 0.003, 0.004]
    volatility_scale_range = [0.8, 0.9, 1.0, 1.1, 1.2] # New parameter for volatility scaling
    
    best_params = None
    best_error = float('inf')
    
    total_combinations = len(omega_range) * len(alpha1_range) * len(alpha2_range) * len(alpha3_range) * len(beta1_range) * len(beta2_range) * len(drift_range) * len(initial_variance_range) * len(volatility_scale_range)
    print(f"Testing {total_combinations} parameter combinations...")
    
    count = 0
    for omega in omega_range:
        for alpha1 in alpha1_range:
            for alpha2 in alpha2_range:
                for alpha3 in alpha3_range:
                    for beta1 in beta1_range:
                        for beta2 in beta2_range:
                            # Skip if alpha1 + alpha2 + alpha3 + beta1 + beta2 >= 1 (non-stationary)
                            if alpha1 + alpha2 + alpha3 + beta1 + beta2 >= 1:
                                continue
                                
                            for drift in drift_range:
                                for initial_variance in initial_variance_range:
                                    for volatility_scale in volatility_scale_range:
                                        params = [omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale]
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
    Optimize GARCH parameters using scipy.optimize with improved bounds and validation.
    """
    target_stats = calculate_statistics(historical_data)
    target_std = target_stats['std']
    
    print("Target Statistics:")
    for stat, value in target_stats.items():
        print(f"  {stat}: {value:.6f}")
    
    # Multiple starting points for better optimization
    starting_points = [
        [0.0001, 0.08, 0.05, 0.02, 0.85, 0.05, 0.0098, 0.002, 1.0],  # Conservative
        [0.0002, 0.15, 0.10, 0.05, 0.75, 0.10, 0.010, 0.003, 0.8],   # Moderate
        [0.00005, 0.05, 0.03, 0.01, 0.90, 0.02, 0.0095, 0.001, 1.2], # Low volatility
        [0.0003, 0.20, 0.15, 0.08, 0.65, 0.15, 0.011, 0.004, 0.7],   # High volatility
        [0.0001, 0.12, 0.08, 0.04, 0.80, 0.08, 0.0098, 0.002, 0.9],  # Balanced
    ]
    
    # Much looser parameter bounds for better exploration
    bounds = [
        (0.00001, 0.002),    # omega - much wider range
        (0.001, 0.5),        # alpha1 - much wider range
        (0.001, 0.5),        # alpha2 - much wider range
        (0.001, 0.5),        # alpha3 - much wider range
        (0.1, 0.99),         # beta1 - wider range
        (0.001, 0.5),        # beta2 - much wider range
        (0.005, 0.020),      # drift - wider range
        (0.0005, 0.01),      # initial_variance - wider range
        (0.2, 3.0)           # volatility_scale - much wider range
    ]
    
    # Multiple optimization methods to try
    methods = ['SLSQP', 'L-BFGS-B', 'TNC']
    best_result = None
    best_error = float('inf')
    best_params = None
    
    print(f"\nOptimizing GARCH parameters with {n_simulations} simulations...")
    print(f"Testing {len(starting_points)} starting points with {len(methods)} optimization methods...")
    
    for i, initial_params in enumerate(starting_points):
        print(f"\n--- Starting Point {i+1}: {initial_params} ---")
        
        for method in methods:
            try:
                print(f"  Trying {method} optimization...")
                
                # Different constraints for different methods
                constraints = None
                if method == 'SLSQP':
                    # Stationarity constraint: alpha1 + alpha2 + alpha3 + beta1 + beta2 < 1
                    constraints = ({'type': 'ineq', 'fun': lambda x: 1 - x[1] - x[2] - x[3] - x[4] - x[5]})
                
                # Create objective function with target_stats in scope
                def objective_with_vol_scale(params):
                    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = params
                    # Generate simulation with current parameters
                    simulated_data = generate_garch_simulation(omega, alpha1, alpha2, alpha3, beta1, beta2, 
                                                             drift, initial_variance, volatility_scale, 5000)  # Use fewer simulations for speed
                    simulated_stats = calculate_statistics(simulated_data)
                    
                    # Calculate weighted sum of squared differences - focus on key metrics
                    weights = {
                        'mean': 25.0,      # Very high weight for mean
                        'median': 20.0,    # Very high weight for median
                        'std': 35.0,       # Very high weight for volatility
                        'p05': 15.0,       # High weight for percentiles
                        'p10': 15.0,
                        'p25': 12.0,
                        'p75': 12.0,
                        'p90': 15.0,
                        'p95': 15.0
                    }
                    
                    total_error = 0
                    for stat_name, target_value in target_stats.items():
                        if stat_name in simulated_stats:
                            error = (simulated_stats[stat_name] - target_value) ** 2
                            weight = weights.get(stat_name, 1.0)
                            total_error += weight * error
                    
                    return total_error
                
                result = minimize(
                    objective_with_vol_scale,
                    initial_params,
                    method=method,
                    bounds=bounds,
                    constraints=constraints,
                    options={'maxiter': 200, 'ftol': 1e-6, 'gtol': 1e-6}
                )
                
                if result.success:
                    # Validate the result with a test simulation
                    test_error = validate_optimization_result(result.x, target_stats, n_simulations)
                    
                    if test_error < best_error:
                        best_result = result
                        best_error = test_error
                        best_params = result.x.tolist()
                        print(f"    ✓ {method} succeeded with error: {test_error:.6f} (NEW BEST)")
                    else:
                        print(f"    ✓ {method} succeeded with error: {test_error:.6f}")
                else:
                    print(f"    ✗ {method} failed: {result.message}")
                    
            except Exception as e:
                print(f"    ✗ {method} failed with error: {e}")
    
    if best_result is None:
        print("\nAll optimization methods failed, using best starting point")
        return starting_points[0], {'success': False, 'fun': float('inf')}
    
    print(f"\nBest optimization result:")
    print(f"  Error: {best_error:.6f}")
    print(f"  Parameters: {best_params}")
    
    return best_params, best_result

def validate_optimization_result(params: List[float], target_stats: Dict[str, float], 
                               n_simulations: int = 10000) -> float:
    """
    Validate optimization result by running a test simulation and calculating error.
    """
    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = params
    
    # Generate test simulation
    simulated_data = generate_garch_simulation(omega, alpha1, alpha2, alpha3, beta1, beta2, 
                                             drift, initial_variance, volatility_scale, n_simulations)
    simulated_stats = calculate_statistics(simulated_data)
    
    # Calculate comprehensive error with detailed weights
    weights = {
        'mean': 25.0,      # Very high weight for mean
        'median': 20.0,    # Very high weight for median
        'std': 35.0,       # Very high weight for volatility
        'p05': 15.0,       # High weight for percentiles
        'p10': 15.0,
        'p25': 12.0,
        'p75': 12.0,
        'p90': 15.0,
        'p95': 15.0
    }
    
    total_error = 0
    for stat_name, target_value in target_stats.items():
        if stat_name in simulated_stats:
            error = (simulated_stats[stat_name] - target_value) ** 2
            weight = weights.get(stat_name, 1.0)
            total_error += weight * error
    
    return total_error

def run_multiple_realizations(params: List[float], target_stats: Dict[str, float], 
                            n_realizations: int = 10, n_simulations: int = 10000) -> Dict:
    """
    Run multiple realizations of GARCH simulations to validate parameter consistency.
    """
    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = params
    
    print(f"\nRunning {n_realizations} realizations with {n_simulations} simulations each...")
    
    all_realizations = []
    percentile_stats = {
        'mean': [], 'median': [], 'std': [], 
        'p05': [], 'p10': [], 'p25': [], 'p75': [], 'p90': [], 'p95': []
    }
    
    for i in range(n_realizations):
        # Generate simulation with current parameters
        simulated_data = generate_garch_simulation(omega, alpha1, alpha2, alpha3, beta1, beta2, 
                                                 drift, initial_variance, volatility_scale, n_simulations)
        simulated_stats = calculate_statistics(simulated_data)
        all_realizations.append(simulated_stats)
        
        # Collect statistics across realizations
        for stat in percentile_stats.keys():
            percentile_stats[stat].append(simulated_stats[stat])
        
        print(f"  Realization {i+1}: mean={simulated_stats['mean']:.6f}, std={simulated_stats['std']:.6f}")
    
    # Calculate statistics across all realizations
    print(f"\nStatistics across {n_realizations} realizations:")
    print(f"{'Statistic':<12} {'Mean':<12} {'Std':<12} {'Min':<12} {'Max':<12} {'Target':<12} {'Bias':<10}")
    print("-" * 85)
    
    total_bias = 0
    total_rmse = 0
    
    for stat in ['mean', 'median', 'std', 'p05', 'p10', 'p25', 'p75', 'p90', 'p95']:
        values = percentile_stats[stat]
        mean_val = np.mean(values)
        std_val = np.std(values)
        min_val = np.min(values)
        max_val = np.max(values)
        target_val = target_stats[stat]
        bias = mean_val - target_val
        rmse = np.sqrt(np.mean([(v - target_val) ** 2 for v in values]))
        
        # Color coding for bias
        if abs(bias) < 0.005:
            status = "✓"
        elif abs(bias) < 0.01:
            status = "⚠️"
        else:
            status = "✗"
        
        print(f"{stat:<12} {mean_val:<12.6f} {std_val:<12.6f} {min_val:<12.6f} {max_val:<12.6f} {target_val:<12.6f} {bias:<9.6f} {status}")
        
        total_bias += abs(bias)
        total_rmse += rmse
    
    avg_bias = total_bias / 9
    avg_rmse = total_rmse / 9
    
    print(f"\nOverall Performance:")
    print(f"  Average Bias: {avg_bias:.6f}")
    print(f"  Average RMSE: {avg_rmse:.6f}")
    
    if avg_bias < 0.005:
        print(f"  ✓ Excellent consistency across realizations")
    elif avg_bias < 0.01:
        print(f"  ✓ Good consistency across realizations")
    elif avg_bias < 0.02:
        print(f"  ⚠️  Moderate consistency across realizations")
    else:
        print(f"  ✗ Poor consistency across realizations")
    
    # Check if percentiles are consistently matched
    print(f"\nPercentile Matching Analysis:")
    percentile_checks = {
        'p10': (0.01, "10th percentile"),
        'p25': (0.01, "25th percentile"), 
        'p50': (0.01, "50th percentile (median)"),
        'p75': (0.01, "75th percentile"),
        'p90': (0.01, "90th percentile")
    }
    
    all_percentiles_good = True
    for stat, (tolerance, description) in percentile_checks.items():
        if stat == 'p50':
            stat_key = 'median'
        else:
            stat_key = stat
            
        mean_val = np.mean(percentile_stats[stat_key])
        target_val = target_stats[stat_key]
        bias = abs(mean_val - target_val)
        
        if bias < tolerance:
            print(f"  ✓ {description}: bias = {bias:.6f} (within tolerance)")
        else:
            print(f"  ✗ {description}: bias = {bias:.6f} (exceeds tolerance)")
            all_percentiles_good = False
    
    if all_percentiles_good:
        print(f"  ✓ All percentiles consistently matched across realizations")
    else:
        print(f"  ⚠️  Some percentiles show inconsistent matching")
    
    return {
        'avg_bias': avg_bias,
        'avg_rmse': avg_rmse,
        'all_realizations': all_realizations,
        'percentile_stats': percentile_stats,
        'all_percentiles_good': all_percentiles_good
    }


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
        if isinstance(optimization_result, dict):
            return optimized_params, optimization_result
        else:
            return optimized_params, {'success': optimization_result.success, 'fun': optimization_result.fun}
    else:
        optimized_params, best_error = grid_search_optimization(historical_data, n_simulations)
        return optimized_params, {'success': True, 'fun': best_error}

def validate_parameters(params: List[float], historical_data: List[float], 
                       n_simulations: int = 10000) -> Dict:
    """
    Validate optimized parameters by comparing simulated vs historical statistics.
    """
    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = params
    
    print(f"\nValidating optimized parameters:")
    print(f"  omega: {omega:.6f}")
    print(f"  alpha1: {alpha1:.6f}")
    print(f"  alpha2: {alpha2:.6f}")
    print(f"  alpha3: {alpha3:.6f}")
    print(f"  beta1: {beta1:.6f}")
    print(f"  beta2: {beta2:.6f}")
    print(f"  drift: {drift:.6f}")
    print(f"  initial_variance: {initial_variance:.6f}")
    print(f"  volatility_scale: {volatility_scale:.6f}")
    
    # Check stationarity constraint
    stationarity_sum = alpha1 + alpha2 + alpha3 + beta1 + beta2
    print(f"  alpha1 + alpha2 + alpha3 + beta1 + beta2: {stationarity_sum:.6f} (should be < 1)")
    if stationarity_sum >= 1:
        print(f"  ⚠️  WARNING: Stationarity constraint violated!")
    else:
        print(f"  ✓ Stationarity constraint satisfied")
    
    # Generate simulation with optimized parameters
    simulated_data = generate_garch_simulation(omega, alpha1, alpha2, alpha3, beta1, beta2, 
                                             drift, initial_variance, volatility_scale, n_simulations)
    
    # Calculate statistics for both datasets
    historical_stats = calculate_statistics(historical_data)
    simulated_stats = calculate_statistics(simulated_data)
    
    print(f"\nDetailed Comparison:")
    print(f"{'Statistic':<12} {'Historical':<12} {'Simulated':<12} {'Difference':<12} {'% Error':<10}")
    print("-" * 65)
    
    total_error = 0
    for stat in ['mean', 'median', 'std', 'p05', 'p10', 'p25', 'p75', 'p90', 'p95']:
        hist_val = historical_stats[stat]
        sim_val = simulated_stats[stat]
        diff = sim_val - hist_val
        pct_error = abs(diff / hist_val) * 100 if hist_val != 0 else 0
        
        # Color coding for errors
        if pct_error < 5:
            status = "✓"
        elif pct_error < 15:
            status = "⚠️"
        else:
            status = "✗"
        
        print(f"{stat:<12} {hist_val:<12.6f} {sim_val:<12.6f} {diff:<12.6f} {pct_error:<9.2f}% {status}")
        total_error += diff ** 2
    
    # Calculate overall fit quality
    rmse = (total_error / 9) ** 0.5
    print(f"\nOverall Fit Quality:")
    print(f"  RMSE: {rmse:.6f}")
    
    if rmse < 0.01:
        print(f"  ✓ Excellent fit")
    elif rmse < 0.02:
        print(f"  ✓ Good fit")
    elif rmse < 0.05:
        print(f"  ⚠️  Moderate fit")
    else:
        print(f"  ✗ Poor fit")
    
    # Check for convergence issues
    print(f"\nConvergence Analysis:")
    
    # Check if parameters are at bounds
    bounds = [
        (0.00001, 0.002), (0.001, 0.5), (0.001, 0.5), (0.001, 0.5),
        (0.1, 0.99), (0.001, 0.5), (0.005, 0.020), (0.0005, 0.01), (0.2, 3.0)
    ]
    
    param_names = ['omega', 'alpha1', 'alpha2', 'alpha3', 'beta1', 'beta2', 'drift', 'initial_variance', 'volatility_scale']
    params_list = [omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale]
    
    at_bounds = []
    for i, (param, (low, high), name) in enumerate(zip(params_list, bounds, param_names)):
        tolerance = (high - low) * 0.01  # 1% of range
        if abs(param - low) < tolerance or abs(param - high) < tolerance:
            at_bounds.append(name)
    
    if at_bounds:
        print(f"  ⚠️  Parameters at bounds: {', '.join(at_bounds)}")
        print(f"  This may indicate the optimization is constrained and could be improved with wider bounds.")
    else:
        print(f"  ✓ No parameters at bounds - good convergence")
    
    # Check parameter relationships
    print(f"\nParameter Relationship Analysis:")
    if alpha1 > alpha2 and alpha2 > alpha3:
        print(f"  ✓ ARCH parameters decrease with lag (typical)")
    else:
        print(f"  ⚠️  ARCH parameters don't follow typical decreasing pattern")
    
    if beta1 > beta2:
        print(f"  ✓ GARCH parameters decrease with lag (typical)")
    else:
        print(f"  ⚠️  GARCH parameters don't follow typical decreasing pattern")
    
    # Check if the model is capturing volatility clustering
    if alpha1 + alpha2 + alpha3 > 0.1:
        print(f"  ✓ ARCH effects present (volatility clustering)")
    else:
        print(f"  ⚠️  Weak ARCH effects")
    
    if beta1 + beta2 > 0.5:
        print(f"  ✓ GARCH effects present (volatility persistence)")
    else:
        print(f"  ⚠️  Weak GARCH effects")
    
    return {
        'rmse': rmse,
        'stationarity_violated': stationarity_sum >= 1,
        'at_bounds': at_bounds,
        'historical_stats': historical_stats,
        'simulated_stats': simulated_stats
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
    
    # Run multiple realizations to validate consistency
    target_stats = calculate_statistics(historical_data)
    realization_results = run_multiple_realizations(optimized_params, target_stats, n_realizations=10, n_simulations=10000)
    
    # Generate JavaScript code
    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = optimized_params
    print(f"\nOptimized JavaScript GARCH Parameters:")
    print(f"const omega = {omega:.6f};        // Constant")
    print(f"const alpha1 = {alpha1:.6f};      // ARCH parameter (lag 1)")
    print(f"const alpha2 = {alpha2:.6f};      // ARCH parameter (lag 2)")
    print(f"const alpha3 = {alpha3:.6f};      // ARCH parameter (lag 3)")
    print(f"const beta1 = {beta1:.6f};         // GARCH parameter (lag 1)")
    print(f"const beta2 = {beta2:.6f};         // GARCH parameter (lag 2)")
    print(f"const drift = {drift:.6f};       // Monthly drift term")
    print(f"let variance = {initial_variance:.6f};  // Initial variance")
    print(f"const volatilityScale = {volatility_scale:.6f};  // Volatility scaling factor")
    
    print(f"\nOptimization complete!")
    
    # Test manually tuned parameters for comparison
    manual_params, manual_results = test_manual_parameters(historical_data)
    
    # Compare results
    print(f"\n" + "="*60)
    print(f"COMPARISON: OPTIMIZED vs MANUAL PARAMETERS")
    print(f"="*60)
    print(f"{'Metric':<20} {'Optimized':<15} {'Manual':<15} {'Better':<10}")
    print("-" * 60)
    
    opt_bias = realization_results['avg_bias']
    man_bias = manual_results['avg_bias']
    opt_rmse = realization_results['avg_rmse']
    man_rmse = manual_results['avg_rmse']
    opt_stationary = validation_results['stationarity_violated'] == False
    man_stationary = True  # Manual params are designed to be stationary
    
    print(f"{'Average Bias':<20} {opt_bias:<15.6f} {man_bias:<15.6f} {'Manual' if man_bias < opt_bias else 'Optimized'}")
    print(f"{'Average RMSE':<20} {opt_rmse:<15.6f} {man_rmse:<15.6f} {'Manual' if man_rmse < opt_rmse else 'Optimized'}")
    print(f"{'Stationarity':<20} {'✗' if not opt_stationary else '✓':<15} {'✓':<15} {'Manual'}")
    print(f"{'All Percentiles':<20} {'✗' if not realization_results['all_percentiles_good'] else '✓':<15} {'✓' if manual_results['all_percentiles_good'] else '✗':<15} {'Manual' if manual_results['all_percentiles_good'] else 'Optimized'}")
    
    print(f"\nRECOMMENDATION:")
    if man_bias < opt_bias and man_rmse < opt_rmse and manual_results['all_percentiles_good']:
        print(f"  Use MANUAL parameters - better performance and stationarity")
        best_params = manual_params
    else:
        print(f"  Use OPTIMIZED parameters - better optimization results")
        best_params = optimized_params
    
    # Generate final JavaScript code with best parameters
    omega, alpha1, alpha2, alpha3, beta1, beta2, drift, initial_variance, volatility_scale = best_params
    print(f"\nFINAL RECOMMENDED JavaScript GARCH Parameters:")
    print(f"const omega = {omega:.6f};        // Constant")
    print(f"const alpha1 = {alpha1:.6f};      // ARCH parameter (lag 1)")
    print(f"const alpha2 = {alpha2:.6f};      // ARCH parameter (lag 2)")
    print(f"const alpha3 = {alpha3:.6f};      // ARCH parameter (lag 3)")
    print(f"const beta1 = {beta1:.6f};         // GARCH parameter (lag 1)")
    print(f"const beta2 = {beta2:.6f};         // GARCH parameter (lag 2)")
    print(f"const drift = {drift:.6f};       // Monthly drift term")
    print(f"let variance = {initial_variance:.6f};  // Initial variance")
    print(f"const volatilityScale = {volatility_scale:.6f};  // Volatility scaling factor")

def test_manual_parameters(historical_data: List[float], n_realizations: int = 10, n_simulations: int = 10000):
    """
    Test manually tuned parameters that respect stationarity and match S&P 500 characteristics.
    """
    print(f"\n" + "="*60)
    print(f"TESTING MANUALLY TUNED GARCH(3,2) PARAMETERS")
    print(f"="*60)
    
    # Manually tuned parameters that respect stationarity constraint
    # alpha1 + alpha2 + alpha3 + beta1 + beta2 = 0.06 + 0.04 + 0.02 + 0.80 + 0.06 = 0.98 < 1
    manual_params = [
        0.00012,  # omega
        0.06,     # alpha1
        0.04,     # alpha2
        0.02,     # alpha3
        0.80,     # beta1
        0.06,     # beta2
        0.0098,   # drift (matches S&P 500 Total Return mean)
        0.0018,   # initial_variance
        0.45      # volatility_scale (calibrated to match std)
    ]
    
    print(f"Manual Parameters:")
    print(f"  omega: {manual_params[0]:.6f}")
    print(f"  alpha1: {manual_params[1]:.6f}")
    print(f"  alpha2: {manual_params[2]:.6f}")
    print(f"  alpha3: {manual_params[3]:.6f}")
    print(f"  beta1: {manual_params[4]:.6f}")
    print(f"  beta2: {manual_params[5]:.6f}")
    print(f"  drift: {manual_params[6]:.6f}")
    print(f"  initial_variance: {manual_params[7]:.6f}")
    print(f"  volatility_scale: {manual_params[8]:.6f}")
    
    # Check stationarity
    stationarity_sum = manual_params[1] + manual_params[2] + manual_params[3] + manual_params[4] + manual_params[5]
    print(f"  alpha1 + alpha2 + alpha3 + beta1 + beta2: {stationarity_sum:.6f} (should be < 1)")
    if stationarity_sum < 1:
        print(f"  ✓ Stationarity constraint satisfied")
    else:
        print(f"  ✗ Stationarity constraint violated!")
    
    # Validate the manual parameters
    target_stats = calculate_statistics(historical_data)
    validation_results = validate_parameters(manual_params, historical_data)
    
    # Run multiple realizations
    realization_results = run_multiple_realizations(manual_params, target_stats, n_realizations, n_simulations)
    
    print(f"\n" + "="*60)
    print(f"MANUAL PARAMETERS SUMMARY")
    print(f"="*60)
    print(f"Stationarity: {'✓' if stationarity_sum < 1 else '✗'}")
    print(f"Average Bias: {realization_results['avg_bias']:.6f}")
    print(f"Average RMSE: {realization_results['avg_rmse']:.6f}")
    print(f"All Percentiles Good: {'✓' if realization_results['all_percentiles_good'] else '✗'}")
    
    return manual_params, realization_results

if __name__ == "__main__":
    main() 