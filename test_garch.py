#!/usr/bin/env python3
"""
Test script to verify the optimized GARCH parameters.
"""

import json
import math
import random
from typing import List, Dict

def load_sp500_data(file_path: str = "public/data/sp500_returns.json") -> List[float]:
    """Load S&P 500 returns data from JSON file."""
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data['returns']

def calculate_statistics(data: List[float]) -> Dict[str, float]:
    """Calculate key statistics for a dataset."""
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
    """Generate GARCH(1,1) simulation data."""
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

def main():
    """Test the optimized parameters."""
    print("Testing Optimized GARCH Parameters")
    print("=" * 40)
    
    # Load historical data
    historical_data = load_sp500_data()
    print(f"Loaded {len(historical_data)} historical data points")
    
    # Optimized parameters
    omega = 0.0002
    alpha = 0.15
    beta = 0.80
    drift = 0.010
    initial_variance = 0.003
    volatility_scale = 0.52  # This should match historical std
    
    print(f"\nOptimized Parameters:")
    print(f"  omega: {omega}")
    print(f"  alpha: {alpha}")
    print(f"  beta: {beta}")
    print(f"  drift: {drift}")
    print(f"  initial_variance: {initial_variance}")
    print(f"  volatility_scale: {volatility_scale}")
    print(f"  alpha + beta: {alpha + beta}")
    
    # Generate simulation
    simulated_data = generate_garch_simulation(omega, alpha, beta, drift, initial_variance, volatility_scale)
    
    # Calculate statistics
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
    
    print(f"\nJavaScript Code:")
    print(f"const omega = {omega};")
    print(f"const alpha = {alpha};")
    print(f"const beta = {beta};")
    print(f"const drift = {drift};")
    print(f"const volatilityScale = {volatility_scale};")
    print(f"let variance = {initial_variance};")

if __name__ == "__main__":
    main() 