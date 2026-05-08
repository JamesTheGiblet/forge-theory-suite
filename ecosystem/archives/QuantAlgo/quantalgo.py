#!/usr/bin/env python3
"""
QuantAlgo: The Forge of Market Intelligence
Complex trading intelligence emerging from simple algorithmic rules
"""

import flask
import sqlite3
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import json
import threading
import time
import random
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import warnings
warnings.filterwarnings('ignore')

# Initialize Flask app
app = flask.Flask(__name__)

# =============================================================================
# DATABASE MANAGEMENT
# =============================================================================

class StockDatabase:
    def __init__(self, db_path="stocks.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize all database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Stock data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS stock_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                date TIMESTAMP NOT NULL,
                open REAL, high REAL, low REAL, close REAL, volume INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(symbol, date)
            )
        ''')
        
        # Predictions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                prediction_date TIMESTAMP NOT NULL,
                predicted_price REAL, actual_price REAL, confidence REAL,
                model_type TEXT, features JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Portfolio table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS portfolio (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL, position_type TEXT,
                entry_price REAL, quantity INTEGER, stop_loss REAL,
                take_profit REAL, entry_date TIMESTAMP, exit_price REAL,
                exit_date TIMESTAMP, status TEXT DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Agent population table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_type TEXT, risk_tolerance REAL, capital REAL,
                performance REAL, generation INTEGER, active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store_stock_data(self, symbol, data):
        """Store stock data in database"""
        conn = sqlite3.connect(self.db_path)
        for date, row in data.iterrows():
            try:
                conn.execute('''
                    INSERT OR REPLACE INTO stock_data 
                    (symbol, date, open, high, low, close, volume)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (symbol, date, row['Open'], row['High'], row['Low'], 
                      row['Close'], row['Volume']))
            except Exception as e:
                print(f"Error storing data for {symbol}: {e}")
        conn.commit()
        conn.close()
    
    def get_stock_data(self, symbol, days=365):
        """Retrieve stock data from database"""
        conn = sqlite3.connect(self.db_path)
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        df = pd.read_sql_query('''
            SELECT date, open, high, low, close, volume 
            FROM stock_data 
            WHERE symbol = ? AND date >= ?
            ORDER BY date
        ''', conn, params=(symbol, cutoff_date))
        
        conn.close()
        
        if not df.empty:
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
        return df
    
    def store_prediction(self, symbol, prediction_date, predicted_price, 
                        actual_price, confidence, model_type, features):
        """Store prediction results"""
        conn = sqlite3.connect(self.db_path)
        conn.execute('''
            INSERT INTO predictions 
            (symbol, prediction_date, predicted_price, actual_price, 
             confidence, model_type, features)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (symbol, prediction_date, predicted_price, actual_price,
              confidence, model_type, json.dumps(features)))
        conn.commit()
        conn.close()
    
    def add_portfolio_position(self, symbol, position_type, entry_price, 
                             quantity, stop_loss, take_profit):
        """Add new portfolio position"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO portfolio 
            (symbol, position_type, entry_price, quantity, stop_loss, 
             take_profit, entry_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (symbol, position_type, entry_price, quantity, 
              stop_loss, take_profit, datetime.now()))
        conn.commit()
        conn.close()
    
    def get_active_positions(self):
        """Get all active portfolio positions"""
        conn = sqlite3.connect(self.db_path)
        df = pd.read_sql_query('''
            SELECT * FROM portfolio 
            WHERE status = 'ACTIVE'
        ''', conn)
        conn.close()
        return df

# =============================================================================
# TRADING AGENTS - SIMPLE RULES
# =============================================================================

class TradingAgent:
    def __init__(self, agent_id, agent_type, risk_tolerance, capital=10000):
        self.id = agent_id
        self.type = agent_type  # 'trend_follower', 'mean_reverter', 'volatility_seeker'
        self.risk = risk_tolerance
        self.capital = capital
        self.performance = 0.0
        self.generation = 1
        self.active = True
    
    def decide(self, market_data):
        """Each agent follows simple deterministic rules"""
        if self.type == 'trend_follower':
            return self._follow_trend(market_data)
        elif self.type == 'mean_reverter':
            return self._revert_to_mean(market_data)
        elif self.type == 'volatility_seeker':
            return self._seek_volatility(market_data)
    
    def _follow_trend(self, data):
        # Simple rule: Buy if price > 20-day MA, Sell if < 20-day MA
        if data['price'] > data['ma_20']:
            return 'BUY', self.risk
        else:
            return 'SELL', self.risk
    
    def _revert_to_mean(self, data):
        # Simple rule: Buy if price < historical mean, Sell if > mean
        if data['price'] < data['mean_price']:
            return 'BUY', self.risk
        else:
            return 'SELL', self.risk
    
    def _seek_volatility(self, data):
        # Simple rule: Buy if volatility increasing, Sell if decreasing
        if data['volatility'] > data['prev_volatility']:
            return 'BUY', self.risk
        else:
            return 'SELL', self.risk

# =============================================================================
# EMERGENCE ENGINE
# =============================================================================

class EmergenceEngine:
    def __init__(self, db):
        self.db = db
        self.agents = []
        self.emergence_history = []
        self.generation = 1
        self.initialize_agents()
    
    def initialize_agents(self):
        """Create initial population of simple trading agents"""
        agent_types = ['trend_follower', 'mean_reverter', 'volatility_seeker']
        self.agents = []
        
        for i in range(100):  # Start with 100 agents
            agent_type = random.choice(agent_types)
            risk = random.uniform(0.01, 0.05)
            self.agents.append(TradingAgent(i, agent_type, risk))
    
    def run_market_iteration(self, market_data):
        """Run one market iteration - agents interact and create emergent behavior"""
        market_sentiment = {'bullish': 0, 'bearish': 0, 'neutral': 0}
        agent_decisions = []
        
        for agent in self.agents:
            if agent.active:
                decision, confidence = agent.decide(market_data)
                agent_decisions.append((agent.type, decision, confidence))
                
                if decision == 'BUY':
                    market_sentiment['bullish'] += confidence
                elif decision == 'SELL':
                    market_sentiment['bearish'] += confidence
        
        # Calculate emergent market trend
        emergent_trend = self._calculate_emergent_trend(market_sentiment)
        self.emergence_history.append(emergent_trend)
        
        return {
            'agent_decisions': agent_decisions[:10],  # Sample
            'market_sentiment': market_sentiment,
            'emergent_trend': emergent_trend,
            'active_agents': len([a for a in self.agents if a.active]),
            'emergence_complexity': self._calculate_emergence_complexity()
        }
    
    def _calculate_emergent_trend(self, sentiment):
        """Complex market behavior emerges from simple agent interactions"""
        total = sentiment['bullish'] + sentiment['bearish']
        if total == 0:
            return 'NEUTRAL'
        
        bull_ratio = sentiment['bullish'] / total
        
        # Emergent properties not programmed into any single agent
        if bull_ratio > 0.7:
            return 'STRONG_BULL'
        elif bull_ratio > 0.55:
            return 'WEAK_BULL'
        elif bull_ratio < 0.3:
            return 'STRONG_BEAR'
        elif bull_ratio < 0.45:
            return 'WEAK_BEAR'
        else:
            return 'NEUTRAL'
    
    def _calculate_emergence_complexity(self):
        """Measure how complex behavior has emerged from simple rules"""
        if len(self.emergence_history) < 5:
            return 0.0
        
        # Complexity measured by pattern diversity
        recent_trends = self.emergence_history[-20:]
        if len(recent_trends) < 5:
            return 0.0
            
        unique_patterns = len(set(recent_trends))
        return min(1.0, unique_patterns / 5.0)  # Normalize to 0-1
    
    def evolve_population(self, performance_data):
        """Evolutionary pressure - successful strategies reproduce"""
        new_agents = []
        
        for agent in self.agents:
            if agent.active:
                # Agents with good performance survive and reproduce
                if performance_data.get(agent.id, 0) > -0.05:  # Better than -5%
                    new_agents.append(agent)
                    
                    # Successful agents spawn variations
                    if performance_data.get(agent.id, 0) > 0.02:
                        child = self._mutate_agent(agent)
                        new_agents.append(child)
        
        # Maintain population size
        while len(new_agents) < 80:
            new_agents.append(self._create_random_agent())
        
        while len(new_agents) > 120:
            new_agents.pop()
        
        self.agents = new_agents
        self.generation += 1
    
    def _mutate_agent(self, parent_agent):
        """Introduce variation through mutation"""
        agent_types = ['trend_follower', 'mean_reverter', 'volatility_seeker']
        new_type = random.choice([parent_agent.type] + agent_types)
        new_risk = max(0.01, min(0.1, parent_agent.risk + random.uniform(-0.01, 0.01)))
        
        new_agent = TradingAgent(
            len(self.agents) + 1, 
            new_type, 
            new_risk,
            parent_agent.capital
        )
        new_agent.generation = self.generation + 1
        
        return new_agent
    
    def _create_random_agent(self):
        """Create a new random agent"""
        agent_types = ['trend_follower', 'mean_reverter', 'volatility_seeker']
        return TradingAgent(
            len(self.agents) + 1,
            random.choice(agent_types),
            random.uniform(0.01, 0.05)
        )

# =============================================================================
# MACHINE LEARNING ENGINE
# =============================================================================

class MLPredictor:
    def __init__(self, db):
        self.db = db
        self.models = {}
        self.scalers = {}
        self.model_types = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boost': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'svm': SVR(kernel='rbf', C=1.0, epsilon=0.1)
        }
    
    def calculate_technical_indicators(self, df):
        """Calculate comprehensive technical indicators"""
        # Price-based features
        df['Returns'] = df['close'].pct_change()
        
        # Moving averages
        for period in [5, 10, 20, 50]:
            df[f'MA_{period}'] = df['close'].rolling(period).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # MACD
        exp1 = df['close'].ewm(span=12).mean()
        exp2 = df['close'].ewm(span=26).mean()
        df['MACD'] = exp1 - exp2
        
        # Volatility
        df['Volatility'] = df['Returns'].rolling(20).std()
        
        return df.dropna()
    
    def prepare_features(self, df):
        """Prepare features for training"""
        feature_columns = [
            'Returns', 'MA_5', 'MA_10', 'MA_20', 'MA_50',
            'RSI', 'MACD', 'Volatility'
        ]
        
        # Ensure all columns exist
        available_features = [col for col in feature_columns if col in df.columns]
        X = df[available_features]
        
        # Create target (next day's price)
        y = df['close'].shift(-1)
        
        # Remove rows with NaN
        valid_indices = ~y.isna() & ~X.isna().any(axis=1)
        X = X[valid_indices]
        y = y[valid_indices]
        
        return X, y
    
    def train_model(self, symbol, model_type='random_forest'):
        """Train specified model type"""
        data = self.db.get_stock_data(symbol)
        if data.empty or len(data) < 100:
            return False, "Insufficient data"
        
        data = self.calculate_technical_indicators(data)
        X, y = self.prepare_features(data)
        
        if len(X) < 50:
            return False, "Not enough data after processing"
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Train/test split
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X_scaled[:split_idx], X_scaled[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # Train model
        model = self.model_types[model_type]
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        accuracy = np.mean(np.abs((y_test - y_pred) / y_test) < 0.05)
        
        # Store model and scaler
        self.models[(symbol, model_type)] = model
        self.scalers[(symbol, model_type)] = scaler
        
        return True, {'mse': mse, 'accuracy': accuracy, 'training_samples': len(X_train)}
    
    def predict_price(self, symbol, model_type='random_forest'):
        """Predict next price using specified model"""
        model_key = (symbol, model_type)
        if model_key not in self.models:
            success, _ = self.train_model(symbol, model_type)
            if not success:
                return None, 0
        
        data = self.db.get_stock_data(symbol, days=100)
        if data.empty:
            return None, 0
        
        data = self.calculate_technical_indicators(data)
        X, _ = self.prepare_features(data)
        
        if len(X) == 0:
            return None, 0
        
        # Get most recent features
        X_recent = X.iloc[-1:].values
        X_recent_scaled = self.scalers[model_key].transform(X_recent)
        
        # Make prediction
        model = self.models[model_key]
        prediction = model.predict(X_recent_scaled)[0]
        
        # Simple confidence calculation
        confidence = 0.7 + random.uniform(0, 0.3)  # Base 70-100% confidence
        
        return prediction, confidence

# =============================================================================
# MAIN APPLICATION
# =============================================================================

# Global instances
db = StockDatabase()
ml_predictor = MLPredictor(db)
emergence_engine = EmergenceEngine(db)
portfolio_value = 100000
real_time_data = {}

# =============================================================================
# FLASK ROUTES
# =============================================================================

@app.route('/')
def index():
    """Serve the main dashboard"""
    return '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuantAlgo - Emergent Market Intelligence</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --qa-primary: #2563eb;
            --qa-secondary: #059669;
            --qa-accent: #7c3aed;
            --qa-dark: #1e293b;
        }
        .qa-primary { background: linear-gradient(135deg, var(--qa-primary), var(--qa-accent)) !important; }
        .qa-secondary { background: var(--qa-secondary) !important; }
        .stock-card { transition: transform 0.2s; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .stock-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
        .emergence-high { background: linear-gradient(135deg, #059669, #10b981) !important; color: white; }
        .emergence-medium { background: linear-gradient(135deg, #d97706, #f59e0b) !important; color: white; }
        .emergence-low { background: linear-gradient(135deg, #dc2626, #ef4444) !important; color: white; }
        .real-time-badge { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
    </style>
</head>
<body>
    <nav class="navbar navbar-dark" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
        <div class="container-fluid">
            <span class="navbar-brand mb-0 h1">
                <i class="fas fa-brain"></i> QuantAlgo
                <span class="badge bg-success">AI</span>
            </span>
            <div class="navbar-text">
                <span class="badge real-time-badge bg-success">
                    <i class="fas fa-circle"></i> EMERGENCE ACTIVE
                </span>
                <span id="current-time" class="ms-2 text-light"></span>
            </div>
        </div>
    </nav>

    <div class="container-fluid mt-4">
        <!-- Emergence Metrics -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-white bg-primary">
                    <div class="card-body text-center">
                        <h6>Emergence Complexity</h6>
                        <h2 id="emergence-level">0%</h2>
                        <small>From Simplicity to Intelligence</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-success">
                    <div class="card-body text-center">
                        <h6>Agent Diversity</h6>
                        <h2 id="agent-diversity">3</h2>
                        <small>Strategy Types</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-warning">
                    <div class="card-body text-center">
                        <h6>Evolution Generation</h6>
                        <h2 id="evolution-generation">1</h2>
                        <small>Selection Cycles</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-info">
                    <div class="card-body text-center">
                        <h6>Collective Intelligence</h6>
                        <h2 id="collective-intelligence">Basic</h2>
                        <small>Emergent Behavior</small>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Main Content -->
            <div class="col-md-8">
                <div class="card stock-card">
                    <div class="card-header text-white qa-primary">
                        <h4><i class="fas fa-search"></i> Stock Analysis & Emergent Prediction</h4>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-8">
                                <input type="text" id="stock-symbol" class="form-control" 
                                       placeholder="Enter stock symbol (AAPL, TSLA, etc.)" value="AAPL">
                            </div>
                            <div class="col-md-4">
                                <button id="analyze-btn" class="btn btn-success w-100">
                                    <i class="fas fa-search"></i> Analyze Emergence
                                </button>
                            </div>
                        </div>
                        <div id="results"></div>
                    </div>
                </div>

                <div class="card stock-card mt-4">
                    <div class="card-header text-white qa-primary">
                        <h4><i class="fas fa-briefcase"></i> Portfolio</h4>
                    </div>
                    <div class="card-body">
                        <div id="portfolio"></div>
                    </div>
                </div>
            </div>

            <!-- Sidebar -->
            <div class="col-md-4">
                <div class="card stock-card">
                    <div class="card-header bg-dark text-white">
                        <h5><i class="fas fa-cogs"></i> Emergence Engine</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Active Agents</label>
                            <div class="progress">
                                <div id="agent-progress" class="progress-bar" style="width: 100%">100</div>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Emergence Progress</label>
                            <div class="progress">
                                <div id="emergence-progress" class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%"></div>
                            </div>
                        </div>
                        <div id="market-sentiment" class="alert alert-info">
                            <strong>Market Sentiment:</strong> Waiting for data...
                        </div>
                    </div>
                </div>

                <div class="card stock-card mt-4">
                    <div class="card-header bg-dark text-white">
                        <h5><i class="fas fa-bolt"></i> Real-time Stream</h5>
                    </div>
                    <div class="card-body">
                        <div id="live-updates"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        class QuantAlgoApp {
            constructor() {
                this.currentSymbol = '';
                this.init();
            }

            init() {
                this.bindEvents();
                this.updateTime();
                this.loadPortfolio();
                this.startLiveUpdates();
                setInterval(() => this.updateTime(), 1000);
                setInterval(() => this.updateEmergenceMetrics(), 2000);
            }

            bindEvents() {
                document.getElementById('analyze-btn').addEventListener('click', () => this.analyzeStock());
            }

            async analyzeStock() {
                const symbol = document.getElementById('stock-symbol').value.toUpperCase();
                const btn = document.getElementById('analyze-btn');
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Emerging...';
                btn.disabled = true;

                try {
                    const response = await axios.get(`/api/stock/${symbol}`);
                    this.displayResults(response.data);
                    this.currentSymbol = symbol;
                } catch (error) {
                    alert('Error: ' + (error.response?.data?.error || error.message));
                } finally {
                    btn.innerHTML = '<i class="fas fa-search"></i> Analyze Emergence';
                    btn.disabled = false;
                }
            }

            displayResults(data) {
                const resultsDiv = document.getElementById('results');
                
                let html = `
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card stock-card">
                                <div class="card-header bg-primary text-white">
                                    <h5>${data.symbol} Analysis</h5>
                                </div>
                                <div class="card-body">
                                    <h2>$${data.current_price.toFixed(2)}</h2>
                                    <p><strong>Emergent Recommendation:</strong> 
                                    <span class="badge bg-${data.recommendation.action === 'BUY' ? 'success' : 'danger'}">
                                        ${data.recommendation.action}
                                    </span></p>
                                    <p>${data.recommendation.reason}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card stock-card">
                                <div class="card-header bg-dark text-white">
                                    <h5>AI Predictions</h5>
                                </div>
                                <div class="card-body">
                `;

                for (const [model, price] of Object.entries(data.predictions)) {
                    const change = ((price - data.current_price) / data.current_price * 100).toFixed(2);
                    html += `
                        <div class="mb-2">
                            <strong>${model.replace('_', ' ').toUpperCase()}:</strong> 
                            $${price.toFixed(2)} 
                            <span class="badge bg-${change >= 0 ? 'success' : 'danger'}">${change}%</span>
                        </div>
                    `;
                }

                html += `</div></div></div></div>`;
                resultsDiv.innerHTML = html;
            }

            async loadPortfolio() {
                try {
                    const response = await axios.get('/api/portfolio');
                    this.displayPortfolio(response.data);
                } catch (error) {
                    console.error('Error loading portfolio:', error);
                }
            }

            displayPortfolio(data) {
                const portfolioDiv = document.getElementById('portfolio');
                if (data.positions.length === 0) {
                    portfolioDiv.innerHTML = '<p class="text-muted">No active positions</p>';
                    return;
                }

                let html = '<div class="table-responsive"><table class="table table-striped"><thead><tr>';
                html += '<th>Symbol</th><th>Type</th><th>Entry</th><th>Current</th><th>P&L</th></tr></thead><tbody>';
                
                data.positions.forEach(pos => {
                    html += `<tr>
                        <td>${pos.symbol}</td>
                        <td><span class="badge bg-${pos.position_type === 'LONG' ? 'success' : 'danger'}">${pos.position_type}</span></td>
                        <td>$${pos.entry_price.toFixed(2)}</td>
                        <td>$${pos.current_price.toFixed(2)}</td>
                        <td class="${pos.pnl >= 0 ? 'text-success' : 'text-danger'}">$${pos.pnl.toFixed(2)}</td>
                    </tr>`;
                });
                
                html += `</tbody></table></div>`;
                portfolioDiv.innerHTML = html;
            }

            updateTime() {
                document.getElementById('current-time').textContent = new Date().toLocaleTimeString();
            }

            async updateEmergenceMetrics() {
                try {
                    const response = await axios.get('/api/emergence');
                    const data = response.data;
                    
                    document.getElementById('emergence-level').textContent = 
                        Math.round(data.emergence_complexity * 100) + '%';
                    document.getElementById('agent-diversity').textContent = 
                        data.agent_diversity;
                    document.getElementById('evolution-generation').textContent = 
                        data.generation;
                    document.getElementById('collective-intelligence').textContent = 
                        data.intelligence_level;
                    document.getElementById('agent-progress').textContent = 
                        data.active_agents;
                    document.getElementById('agent-progress').style.width = 
                        (data.active_agents / 100 * 100) + '%';
                    document.getElementById('emergence-progress').style.width = 
                        (data.emergence_complexity * 100) + '%';
                    
                    // Update market sentiment
                    const sentimentDiv = document.getElementById('market-sentiment');
                    sentimentDiv.innerHTML = `<strong>Emergent Trend:</strong> ${data.emergent_trend}`;
                    sentimentDiv.className = `alert alert-${this.getTrendColor(data.emergent_trend)}`;
                } catch (error) {
                    console.error('Error updating metrics:', error);
                }
            }

            getTrendColor(trend) {
                const colors = {
                    'STRONG_BULL': 'success',
                    'WEAK_BULL': 'info', 
                    'NEUTRAL': 'secondary',
                    'WEAK_BEAR': 'warning',
                    'STRONG_BEAR': 'danger'
                };
                return colors[trend] || 'secondary';
            }

            startLiveUpdates() {
                setInterval(() => {
                    const updatesDiv = document.getElementById('live-updates');
                    const symbols = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN'];
                    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
                    const change = (Math.random() - 0.5) * 2;
                    
                    const update = `
                        <div class="alert alert-${change > 0 ? 'success' : 'danger'} alert-dismissible fade show">
                            <strong>${symbol}</strong> ${change > 0 ? '+' : ''}${change.toFixed(2)}%
                            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                        </div>
                    `;
                    
                    if (updatesDiv.children.length > 3) {
                        updatesDiv.removeChild(updatesDiv.lastChild);
                    }
                    updatesDiv.innerHTML = update + updatesDiv.innerHTML;
                }, 3000);
            }
        }

        // Initialize the application
        const quantAlgo = new QuantAlgoApp();
    </script>
</body>
</html>
    '''

@app.route('/api/stock/<symbol>')
def analyze_stock(symbol):
    """Analyze stock and return predictions with emergence data"""
    try:
        # Fetch stock data
        stock = yf.download(symbol, period="1y")
        if stock.empty:
            return {'error': 'Invalid symbol'}, 400
        
        # Store in database
        db.store_stock_data(symbol, stock)
        
        # Get current price
        current_price = stock['Close'].iloc[-1]
        
        # Prepare market data for agents
        market_data = {
            'price': current_price,
            'ma_20': stock['Close'].tail(20).mean(),
            'mean_price': stock['Close'].mean(),
            'volatility': stock['Close'].pct_change().std(),
            'prev_volatility': stock['Close'].pct_change().tail(10).std()
        }
        
        # Run emergence engine
        emergence_result = emergence_engine.run_market_iteration(market_data)
        
        # Get ML predictions
        predictions = {}
        for model_type in ['random_forest', 'gradient_boost', 'svm']:
            price, confidence = ml_predictor.predict_price(symbol, model_type)
            if price:
                predictions[model_type] = price
        
        # Generate recommendation based on emergence
        avg_prediction = sum(predictions.values()) / len(predictions) if predictions else current_price
        price_change = (avg_prediction - current_price) / current_price
        
        if emergence_result['emergent_trend'] in ['STRONG_BULL', 'WEAK_BULL'] and price_change > 0.02:
            action = 'BUY'
            reason = 'Bullish emergence with positive AI prediction'
        elif emergence_result['emergent_trend'] in ['STRONG_BEAR', 'WEAK_BEAR'] and price_change < -0.02:
            action = 'SELL'
            reason = 'Bearish emergence with negative AI prediction'
        else:
            action = 'HOLD'
            reason = 'Neutral market conditions'
        
        return {
            'symbol': symbol,
            'current_price': current_price,
            'predictions': predictions,
            'emergence': emergence_result,
            'recommendation': {
                'action': action,
                'reason': reason,
                'confidence': emergence_result['emergence_complexity']
            }
        }
    
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/api/emergence')
def get_emergence_metrics():
    """Get current emergence engine metrics"""
    complexity = emergence_engine._calculate_emergence_complexity()
    active_agents = len([a for a in emergence_engine.agents if a.active])
    
    # Calculate agent diversity
    agent_types = [a.type for a in emergence_engine.agents if a.active]
    diversity = len(set(agent_types))
    
    # Determine intelligence level
    if complexity > 0.8:
        intelligence = 'Advanced'
    elif complexity > 0.6:
        intelligence = 'Intermediate'
    elif complexity > 0.3:
        intelligence = 'Basic'
    else:
        intelligence = 'Forming'
    
    # Get current emergent trend
    current_trend = emergence_engine.emergence_history[-1] if emergence_engine.emergence_history else 'NEUTRAL'
    
    return {
        'emergence_complexity': complexity,
        'active_agents': active_agents,
        'agent_diversity': diversity,
        'generation': emergence_engine.generation,
        'intelligence_level': intelligence,
        'emergent_trend': current_trend
    }

@app.route('/api/portfolio')
def get_portfolio():
    """Get portfolio data"""
    positions = db.get_active_positions()
    portfolio_data = []
    
    for _, position in positions.iterrows():
        # Simulate current price
        current_price = real_time_data.get(position['symbol'], position['entry_price'] * random.uniform(0.9, 1.1))
        
        if position['position_type'] == 'LONG':
            pnl = (current_price - position['entry_price']) * position['quantity']
        else:
            pnl = (position['entry_price'] - current_price) * position['quantity']
        
        portfolio_data.append({
            'symbol': position['symbol'],
            'position_type': position['position_type'],
            'entry_price': position['entry_price'],
            'current_price': current_price,
            'quantity': position['quantity'],
            'pnl': pnl
        })
    
    return {'positions': portfolio_data}

@app.route('/api/portfolio/add', methods=['POST'])
def add_position():
    """Add position to portfolio"""
    data = flask.request.json
    symbol = data['symbol']
    position_type = data['position_type']
    entry_price = float(data['entry_price'])
    quantity = int(data['quantity'])
    
    # Calculate stop loss (5% for demo)
    stop_loss = entry_price * 0.95 if position_type == 'LONG' else entry_price * 1.05
    take_profit = entry_price * 1.10 if position_type == 'LONG' else entry_price * 0.90
    
    db.add_portfolio_position(symbol, position_type, entry_price, quantity, stop_loss, take_profit)
    
    return {'status': 'success'}

def simulate_market_updates():
    """Background thread to simulate real-time market updates"""
    while True:
        # Update real-time data for portfolio
        symbols = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN']
        for symbol in symbols:
            # Simulate price changes
            if symbol in real_time_data:
                change = random.uniform(-0.02, 0.02)
                real_time_data[symbol] *= (1 + change)
            else:
                # Get actual current price
                try:
                    stock = yf.Ticker(symbol)
                    hist = stock.history(period='1d')
                    if not hist.empty:
                        real_time_data[symbol] = hist['Close'].iloc[-1]
                except:
                    real_time_data[symbol] = random.uniform(100, 500)
        
        # Occasionally evolve the agent population
        if random.random() < 0.1:  # 10% chance each iteration
            performance_data = {i: random.uniform(-0.1, 0.2) for i in range(len(emergence_engine.agents))}
            emergence_engine.evolve_population(performance_data)
        
        time.sleep(10)  # Update every 10 seconds

if __name__ == '__main__':
    # Start background market simulation
    market_thread = threading.Thread(target=simulate_market_updates, daemon=True)
    market_thread.start()
    
    print("QuantAlgo starting on http://localhost:5000")
    print("Watching emergence complexity grow from simple rules...")
    app.run(debug=True, host='0.0.0.0', port=5000)