import json
from datetime import datetime, timedelta
import os
import pandas as pd
import time
import yfinance as yf
import numpy as np

def fetch_sp500_data():
    try:
        print("Fetching S&P 500 Total Return data from Yahoo Finance...")
        
        # Fetch S&P 500 Total Return ETF (SPY) data since 1980
        # Note: SPY started in 1993, but we'll use it as a proxy for S&P 500 Total Return
        # For earlier data, we'll use ^SP500TR which is the S&P 500 Total Return index
        ticker = yf.Ticker("^SP500TR")
        
        # Get historical data since 1980
        hist = ticker.history(start="1980-01-01", end=datetime.now().strftime('%Y-%m-%d'), interval="1mo")
        
        if hist.empty:
            print("No data received from Yahoo Finance")
            return
            
        print(f"Successfully fetched {len(hist)} months of data")
        print(f"Date range: {hist.index[0].strftime('%Y-%m-%d')} to {hist.index[-1].strftime('%Y-%m-%d')}")
        
        # Calculate monthly returns from Close prices
        returns = []
        for i in range(1, len(hist)):
            prev_close = hist['Close'].iloc[i-1]
            curr_close = hist['Close'].iloc[i]
            monthly_return = (curr_close - prev_close) / prev_close
            # Replace NaN with 0
            if pd.isna(monthly_return):
                monthly_return = 0
            returns.append(float(monthly_return))  # Convert to float for JSON serialization
        
        print(f"Calculated {len(returns)} monthly returns")
        
        # Calculate some basic statistics
        mean_return = np.mean(returns)
        std_return = np.std(returns)
        print(f"Mean monthly return: {mean_return:.4f} ({mean_return*100:.2f}%)")
        print(f"Std monthly return: {std_return:.4f} ({std_return*100:.2f}%)")
        
        # Create data directory if it doesn't exist
        os.makedirs('public/data', exist_ok=True)
        
        # Save to JSON file
        output_data = {
            'returns': returns,
            'last_updated': datetime.now().isoformat(),
            'info': {
                'name': 'S&P 500 Total Return Index',
                'source': 'Yahoo Finance',
                'ticker': '^SP500TR',
                'description': 'S&P 500 Total Return Index (includes dividends)'
            },
            'date_range': {
                'start': hist.index[0].isoformat(),
                'end': hist.index[-1].isoformat()
            },
            'data_points': len(returns),
            'symbol': 'SP500TR',
            'statistics': {
                'mean_monthly_return': float(mean_return),
                'std_monthly_return': float(std_return),
                'mean_annual_return': float(mean_return * 12),
                'std_annual_return': float(std_return * np.sqrt(12))
            }
        }
        
        with open('public/data/sp500_returns.json', 'w') as f:
            json.dump(output_data, f, indent=2)
            
        print("Successfully saved data to public/data/sp500_returns.json")
        
    except Exception as e:
        print(f"Error fetching data: {str(e)}")
        raise

if __name__ == "__main__":
    fetch_sp500_data() 