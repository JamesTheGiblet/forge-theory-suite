const { BaseAgent } = require('./base_agent');
const https = require('https');

class GeminiAssistant extends BaseAgent {
  constructor(scpConfig, engine) {
    super(scpConfig, engine);
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.conversationHistory = [];
    this.maxHistory = 50;
    this.enabled = !!(this.apiKey && this.apiKey !== 'your_gemini_api_key_here');
  }
  
  async start() {
    await super.start();
    if (this.enabled) {
      this.log(`🧠 Gemini Assistant active (model: ${this.model})`);
    } else {
      this.log('⚠️ Gemini Assistant disabled - add GEMINI_API_KEY to .env');
    }
    return true;
  }
  
  async ask(question, context = {}) {
    if (!this.enabled) {
      return this.fallbackResponse(question);
    }
    
    // Build system prompt with LEGION context
    const systemPrompt = this.buildSystemPrompt(context);
    
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', parts: [{ text: question }] });
    if (this.conversationHistory.length > this.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistory);
    }
    
    try {
      const response = await this.callGemini(systemPrompt, question);
      
      // Store response in history
      this.conversationHistory.push({ role: 'model', parts: [{ text: response }] });
      
      return response;
    } catch (err) {
      this.log(`Gemini error: ${err.message}`, 'error');
      return this.fallbackResponse(question);
    }
  }
  
  buildSystemPrompt(context) {
    return `You are Legion, an AI assistant for the LEGION MK20 trading framework. 
You are helpful, knowledgeable, and concise. You have access to real-time system data.

Current system context:
- Entropy: ${context.entropy || 'unknown'}/0.7
- Agents running: ${context.agents || 'unknown'}
- Paper mode: ${context.paper_mode || 'unknown'}
- Strategies: ${context.strategies || 'unknown'}

Available commands you can suggest: status, agents, entropy, prices, reports, leaderboard, arbitrage

Respond conversationally. Keep answers under 3 sentences unless asked for details.`;
  }
  
  async callGemini(systemPrompt, userMessage) {
    return new Promise((resolve, reject) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\nUser: ' + userMessage }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topP: 0.9
        }
      };
      
      const data = JSON.stringify(payload);
      
      const req = https.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(responseData);
            if (json.candidates && json.candidates[0]?.content?.parts[0]?.text) {
              resolve(json.candidates[0].content.parts[0].text);
            } else if (json.error) {
              reject(new Error(json.error.message));
            } else {
              reject(new Error('Unexpected response format'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
  
  fallbackResponse(question) {
    // Simple command-based fallback when Gemini is unavailable
    const q = question.toLowerCase();
    if (q.includes('status')) return "System status unknown. Please check if LEGION is running.";
    if (q.includes('help')) return "I can help with: status, agents, entropy, prices, reports. Get a Gemini API key from https://aistudio.google.com/app/apikey for full AI capabilities.";
    return "I'm running in fallback mode. Add GEMINI_API_KEY to .env for full AI assistant capabilities.";
  }
  
  async getSystemContext() {
    try {
      const http = require('http');
      const status = await this.httpGet('/api/status');
      const agents = await this.httpGet('/api/agents');
      const entropy = await this.httpGet('/api/entropy');
      const strategies = await this.httpGet('/api/librarian/records');
      
      return {
        entropy: entropy.entropy,
        threshold: entropy.threshold,
        status: entropy.status,
        agents: status.agents,
        paper_mode: status.paper_mode,
        strategies: strategies?.count || 0,
        agent_list: agents.map(a => a.name).slice(0, 10)
      };
    } catch (err) {
      return {};
    }
  }
  
  httpGet(endpoint) {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:3011${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = { GeminiAssistant };
