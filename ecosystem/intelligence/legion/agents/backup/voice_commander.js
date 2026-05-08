const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const { sendMessage } = require('../bus/router');
const { getCurrentPrice, getAllPrices } = require('../shared/kraken_adapter');
const { getSentiment } = require('../shared/sentiment');
const { getLeaderboard } = require('./tournament');
const { LightweightPredictor } = require('../engine/lightweight_predictor');
const { ArbitrageEngine } = require('../engine/arbitrage_engine');

const execPromise = promisify(exec);

class VoiceCommander {
  constructor() {
    this.wakeWord = "legion";
    this.predictor = new LightweightPredictor();
    this.arbitrage = new ArbitrageEngine();
    this.lastPnL = 0;
    this.mood = { current: 'neutral', phrases: { happy: ['Nice!', 'Excellent!', 'Winning!'], grumpy: ['Ugh.', 'Not great.'], neutral: ['Okay.', 'Noted.'] } };
    this.isAwake = false;
    this.listening = true;
  }

  async getPnLMood() {
    try {
      const res = await fetch('http://localhost:3002/api/portfolio/metrics');
      const data = await res.json();
      const pnl = data.metrics.totalPnl || 0;
      if (pnl > this.lastPnL + 0.005) this.mood.current = 'happy';
      else if (pnl < this.lastPnL - 0.005) this.mood.current = 'grumpy';
      else this.mood.current = 'neutral';
      this.lastPnL = pnl;
    } catch(e) {}
  }

  addMood(text) {
    const phrases = this.mood.phrases[this.mood.current];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    return Math.random() < 0.3 ? `${randomPhrase} ${text}` : text;
  }

  async recordAudio(seconds) {
    const filename = `/tmp/legion_voice_${Date.now()}.wav`;
    try {
      await execPromise(`termux-microphone-record -f ${filename} -d ${seconds} -e wav`);
      return filename;
    } catch(e) {
      // console.log('[VOICE] Microphone error:', e.message);
      return null;
    }
  }

  async speechToText(audioFile) {
    if (!audioFile || !fs.existsSync(audioFile)) return null;
    try {
      const audio = fs.readFileSync(audioFile);
      const base64 = audio.toString('base64');
      const response = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' },
          audio: { content: base64 }
        })
      });
      const data = await response.json();
      if (data.results && data.results[0]?.alternatives[0]?.transcript) {
        return data.results[0].alternatives[0].transcript;
      }
    } catch(e) {
      // console.log('[VOICE] STT error:', e.message);
    }
    return null;
  }

  async listen() {
    // console.log('[VOICE] Listening... Say "LEGION" followed by a command (e.g., "LEGION, what is the market doing?")');
    
    setInterval(async () => {
      if (!this.listening) return;
      
      const audioFile = await this.recordAudio(3);
      if (!audioFile) return;
      
      const text = await this.speechToText(audioFile);
      fs.unlink(audioFile, () => {});
      
      if (text && text.toLowerCase().includes(this.wakeWord)) {
        // console.log(`[VOICE] Wake word detected: "${text}"`);
        await this.processCommand(text);
      }
    }, 5000);
  }

  async processCommand(spokenText) {
    await this.getPnLMood();
    let responseText = '';
    const lower = spokenText.toLowerCase();
    
    // Extract command after wake word
    let command = lower;
    if (lower.includes(this.wakeWord)) {
      command = lower.split(this.wakeWord)[1] || lower;
    }

    if (command.includes('predict') || command.includes('forecast')) {
      const candles = require('../shared/kraken_adapter').getCandles('BTC/USD', 100);
      const prediction = this.predictor.predict(candles);
      const current = await getCurrentPrice('BTC/USD');
      const change = ((prediction - current) / current * 100).toFixed(1);
      responseText = `I predict BTC will be around $${prediction.toFixed(0)} in one hour. That's a ${change} percent change.`;
    }
    else if (command.includes('leaderboard') || command.includes('top strategy')) {
      const leaderboard = getLeaderboard();
      if (leaderboard.length > 0) {
        const top = leaderboard[0];
        responseText = `${top.strategyId} is leading with ${(top.realPnl*100).toFixed(1)} percent profit and a ${top.winRate*100} percent win rate.`;
      } else {
        responseText = "No strategies are competing in the tournament right now.";
      }
    }
    else if (command.includes('vix') || command.includes('volatility')) {
      const stats = await this.getCoreStats();
      responseText = `The Crypto VIX is ${stats.vix?.toFixed(1) || 'unknown'}.`;
    }
    else if (command.includes('arbitrage')) {
      const opportunities = await this.arbitrage.scan();
      if (opportunities.length > 0) {
        const opp = opportunities[0];
        responseText = `Found an arbitrage opportunity in ${opp.pair}: ${opp.deviation} percent ${opp.direction}. ${opp.signal}.`;
      } else {
        responseText = "No arbitrage opportunities at the moment.";
      }
    }
    else if (command.includes('market') || command.includes('price')) {
      const prices = await getAllPrices();
      responseText = `BTC is at $${prices['BTC/USD']?.toFixed(0)}. ETH is $${prices['ETH/USD']?.toFixed(0)}. SOL is $${prices['SOL/USD']?.toFixed(2)}.`;
    }
    else if (command.includes('sentiment') || command.includes('fear')) {
      const sentiment = getSentiment();
      responseText = `Fear and Greed index is ${sentiment?.value || 50}, which is ${sentiment?.classification || 'Neutral'}.`;
    }
    else if (command.includes('paper mode')) {
      const stats = await this.getCoreStats();
      responseText = `Paper mode has ${stats.paperHours?.toFixed(0) || 48} hours remaining. No real money is at risk.`;
    }
    else if (command.includes('how are you')) {
      responseText = this.addMood(`I'm ${this.mood.current}. PnL is ${(this.lastPnL*100).toFixed(1)} percent.`);
    }
    else if (command.includes('hello') || command.includes('hey')) {
      responseText = this.addMood("Hello, commander. Ready to trade?");
    }
    else {
      responseText = this.addMood("I didn't catch that. Try asking about market, prediction, leaderboard, VIX, or arbitrage.");
    }
    
    responseText = this.addMood(responseText);
    await this.speak(responseText);
    sendMessage('diplomat', 'VOICE_COMMAND', { command: spokenText, response: responseText });
  }

  async speak(text) {
    const cleanText = text.replace(/[^a-zA-Z0-9 .,!?]/g, '');
    exec(`termux-tts-speak "${cleanText}"`, (err) => {
      if (err) // console.log('[VOICE] TTS error:', err.message);
    });
  }

  async getCoreStats() {
    try {
      const res = await fetch('http://localhost:3001/api/stats');
      return await res.json();
    } catch(e) {
      return { strategies: 0, breaches: 0, paperHours: 48, vix: 30 };
    }
  }

  start() {
    // console.log('[VOICE] Commander active. Say "LEGION" followed by a command.');
    this.listen();
  }
}

module.exports = { VoiceCommander };
