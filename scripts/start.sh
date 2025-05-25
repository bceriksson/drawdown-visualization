#!/bin/bash

# Install Python dependencies if not already installed
pip install -r requirements.txt

# Run Python script to fetch S&P 500 data
python scripts/fetch_sp500_data.py

# Start React app
npm start 