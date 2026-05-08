"""
IGNITION FAILURE DETECTOR
-------------------------
Analyzes historical IGNITION entries to identify signals that predict
failure (transition to ANCHOR) vs success (transition to CASCADE).

Usage: python scripts/analyze_ignition.py
"""

import pandas as pd
import numpy as np
import os

# Configuration - Paths relative to project root
DATA_PATH = os.path.join('data', 'btc_historical_merged.csv')
HISTORY_PATH = os.path.join('backtest-results', 'state_history.csv')
OUTPUT_PATH = os.path.join('backtest-results', 'ignition_analysis.csv')

def calculate_indicators(df):
    """Calculate technical indicators for analysis."""
    df = df.copy()
    # Ensure numeric
    for col in ['close', 'volume']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # 1. RSI (14)
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['rsi_14']
