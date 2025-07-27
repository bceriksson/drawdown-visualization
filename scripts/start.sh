#!/bin/bash

# Activate virtual environment and install Python dependencies if not already installed
source venv/bin/activate
pip install -r requirements.txt

# Run Python script to fetch S&P 500 data
python scripts/fetch_sp500_data.py

# Start React app
npm start 