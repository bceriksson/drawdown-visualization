import json
from datetime import datetime, timedelta
import os
import pandas as pd
import time
from fredapi import Fred
import numpy as np

def fetch_with_retry(fred, series_id, max_retries=3, delay=2):
    for attempt in range(max_retries):
        try:
            print(f"Attempt {attempt + 1} of {max_retries}")
            
            # Get historical data from FRED
            # SP500 is the series ID for S&P 500
            hist = fred.get_series(series_id, 
                                 observation_start='1993-01-01',  # SPY inception date
                                 observation_end=datetime.now().strftime('%Y-%m-%d'),
                                 frequency='m')  # Monthly frequency
            
            if not hist.empty:
                return hist
                
            print(f"No data received, waiting {delay} seconds before retry...")
            time.sleep(delay)
            
        except Exception as e:
            print(f"Error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                print(f"Waiting {delay} seconds before retry...")
                time.sleep(delay)
            else:
                raise
    
    raise ValueError(f"Failed to fetch data after {max_retries} attempts")

def fetch_sp500_data():
    try:
        print("Fetching S&P 500 data from FRED...")
        
        # Initialize FRED API client
        # You'll need to set your FRED API key in the environment variable FRED_API_KEY
        fred = Fred(api_key='d45f37b04a314997317023e82c03e517')
        
        # Fetch S&P 500 data with retry logic
        hist = fetch_with_retry(fred, 'NASDAQCOM')
            
        print(f"Successfully fetched {len(hist)} months of data")
        
        # Calculate monthly returns
        returns = []
        for i in range(1, len(hist)):
            prev_close = hist.iloc[i-1]
            curr_close = hist.iloc[i]
            monthly_return = (curr_close - prev_close) / prev_close
            # Replace NaN with 0
            if pd.isna(monthly_return):
                monthly_return = 0
            returns.append(float(monthly_return))  # Convert to float for JSON serialization
        
        print(f"Calculated {len(returns)} monthly returns")
        
        # Create data directory if it doesn't exist
        os.makedirs('public/data', exist_ok=True)
        
        # Save to JSON file
        output_data = {
            'returns': returns,
            'last_updated': datetime.now().isoformat(),
            'info': {
                'name': 'S&P 500 Index',
                'source': 'FRED',
                'series_id': 'SP500',
                'description': 'S&P 500 Index'
            },
            'date_range': {
                'start': hist.index[0].isoformat(),
                'end': hist.index[-1].isoformat()
            },
            'data_points': len(returns),
            'symbol': 'SP500'
        }
        
        with open('public/data/sp500_returns.json', 'w') as f:
            json.dump(output_data, f, indent=2)
            
        print("Successfully saved data to public/data/sp500_returns.json")
        
    except Exception as e:
        print(f"Error fetching data: {str(e)}")
        raise

if __name__ == "__main__":
    fetch_sp500_data() 