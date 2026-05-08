const https = require('https');
const { sendMessage } = require('../bus/router');

class SocialSentiment {
  constructor() {
    this.scores = {
      twitter: 0,
      reddit: 0,
      news: 0,
      overall: 0
    };
    this.lastUpdate = null;
  }

  // Twitter/X trends (using free unofficial API)
  async getTwitterTrends() {
    return new Promise((resolve) => {
      // Use a free crypto trends endpoint
      https.get('https://api.coingecko.com/api/v3/search/trending', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const coins = json.coins?.slice(0, 5).map(c => c.item.name) || [];
            resolve(coins);
          } catch(e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  // News from CryptoPanic (free tier)
  async getCryptoNews() {
    return new Promise((resolve) => {
      https.get('https://cryptopanic.com/api/v1/posts/?auth_token=process.env.CRYPTOPANIC_TOKEN || "demo"&kind=news&public=true', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const headlines = json.results?.slice(0, 10).map(a => ({
              title: a.title,
              domain: a.domain,
              votes: a.votes?.positive || 0
            })) || [];
            resolve(headlines);
          } catch(e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  // Alternative: RSS feeds
  async getRSSFeeds() {
    const feeds = [
      'https://cointelegraph.com/rss',
      'https://coindesk.com/feed/',
      'https://decrypt.co/feed'
    ];
    // RSS parsing would require a library; simplified for now
    return [];
  }

  async analyzeSentiment() {
    console.log('[SOCIAL] Analyzing social sentiment...');
    
    const trends = await this.getTwitterTrends();
    const news = await this.getCryptoNews();
    
    // Calculate sentiment scores
    let twitterScore = trends.length > 0 ? 60 : 50;
    let newsScore = news.length > 0 ? 55 : 50;
    
    // Adjust based on news sentiment (simplified keyword analysis)
    let bullishCount = 0;
    let bearishCount = 0;
    const bullishWords = ['bull', 'rally', 'surge', 'moon', 'breakout'];
    const bearishWords = ['bear', 'crash', 'dump', 'fear', 'panic'];
    
    for (const article of news) {
      const title = article.title.toLowerCase();
      for (const word of bullishWords) {
        if (title.includes(word)) bullishCount++;
      }
      for (const word of bearishWords) {
        if (title.includes(word)) bearishCount++;
      }
    }
    
    if (bullishCount > bearishCount) newsScore = 65;
    else if (bearishCount > bullishCount) newsScore = 35;
    
    const overall = (twitterScore + newsScore) / 2;
    
    this.scores = {
      twitter: twitterScore,
      news: newsScore,
      overall: overall
    };
    this.lastUpdate = Date.now();
    
    let sentiment = 'neutral';
    if (overall > 60) sentiment = 'bullish';
    else if (overall < 40) sentiment = 'bearish';
    
    console.log(`[SOCIAL] Sentiment: ${sentiment} (${overall.toFixed(0)}/100) | Twitter: ${twitterScore} | News: ${newsScore}`);
    
    // Send alert for significant sentiment shifts
    if (overall > 65 || overall < 35) {
      sendMessage('diplomat', 'SOCIAL_SENTIMENT', {
        sentiment,
        overall: overall.toFixed(0),
        twitter: twitterScore,
        news: newsScore,
        trends: trends.slice(0, 3)
      });
    }
    
    return { sentiment, overall, twitterScore, newsScore, trends };
  }

  start(intervalMinutes = 30) {
    console.log('[SOCIAL] Social sentiment active (every 30 min)');
    this.analyzeSentiment();
    setInterval(() => this.analyzeSentiment(), intervalMinutes * 60 * 1000);
  }
}

module.exports = { SocialSentiment };
