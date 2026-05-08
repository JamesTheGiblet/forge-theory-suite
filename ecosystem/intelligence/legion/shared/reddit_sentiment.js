const https = require('https');
const { sendMessage } = require('../bus/router');

class RedditSentiment {
  constructor() {
    this.sentimentCache = {
      score: 0,
      sentiment: 'neutral',
      lastUpdate: null
    };
  }

  async fetchRedditPosts(subreddit = 'CryptoCurrency', limit = 25) {
    return new Promise((resolve) => {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
      
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const posts = json.data.children.map(child => ({
              title: child.data.title,
              score: child.data.score,
              num_comments: child.data.num_comments,
              created: child.data.created_utc
            }));
            resolve(posts);
          } catch(e) {
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  analyzeSentiment(posts) {
    if (!posts.length) return { score: 0, sentiment: 'neutral' };
    
    const bullishKeywords = ['moon', 'bullish', 'buy', 'hodl', 'lambo', 'gem', 'undervalued', 'accumulate', '🚀', 'up only'];
    const bearishKeywords = ['dump', 'bearish', 'sell', 'crash', 'scam', 'overvalued', 'panic', 'fud', 'rug', 'down only'];
    
    let bullishScore = 0;
    let bearishScore = 0;
    
    for (const post of posts) {
      const title = post.title.toLowerCase();
      for (const word of bullishKeywords) {
        if (title.includes(word)) bullishScore += Math.max(1, post.score / 100);
      }
      for (const word of bearishKeywords) {
        if (title.includes(word)) bearishScore += Math.max(1, post.score / 100);
      }
    }
    
    const total = bullishScore + bearishScore;
    const netScore = total > 0 ? (bullishScore - bearishScore) / total : 0;
    
    let sentiment = 'neutral';
    if (netScore > 0.2) sentiment = 'bullish';
    else if (netScore < -0.2) sentiment = 'bearish';
    
    return {
      score: netScore,
      sentiment: sentiment,
      bullishCount: bullishScore > 0 ? Math.round(bullishScore) : 0,
      bearishCount: bearishScore > 0 ? Math.round(bearishScore) : 0,
      totalPosts: posts.length
    };
  }

  async scan() {
    console.log('[REDDIT] Scanning r/CryptoCurrency...');
    try {
      const posts = await this.fetchRedditPosts('CryptoCurrency', 50);
      const sentiment = this.analyzeSentiment(posts);
      
      this.sentimentCache = {
        ...sentiment,
        lastUpdate: Date.now()
      };
      
      console.log(`[REDDIT] Sentiment: ${sentiment.sentiment} (score: ${sentiment.score.toFixed(2)}) | Bullish: ${sentiment.bullishCount} | Bearish: ${sentiment.bearishCount}`);
      
      // Send alert for significant sentiment shifts
      if (Math.abs(sentiment.score) > 0.25) {
        const emoji = sentiment.sentiment === 'bullish' ? '🐂' : (sentiment.sentiment === 'bearish' ? '🐻' : '🤔');
        const text = `${emoji} *REDDIT SENTIMENT*\n\n` +
          `*Market Mood:* ${sentiment.sentiment.toUpperCase()}\n` +
          `*Score:* ${sentiment.score.toFixed(2)}\n` +
          `*Bullish Signals:* ${sentiment.bullishCount}\n` +
          `*Bearish Signals:* ${sentiment.bearishCount}\n` +
          `*Posts Analyzed:* ${sentiment.totalPosts}\n\n` +
          `_Based on r/CryptoCurrency hot posts._`;
        sendMessage('diplomat', 'REDDIT_SENTIMENT', { text, ...sentiment });
      }
    } catch (err) {
      console.error('[REDDIT] Error:', err.message);
    }
  }

  start(intervalMinutes = 30) {
    console.log('[REDDIT] Sentiment tracker active (every 30 min)');
    this.scan();
    setInterval(() => this.scan(), intervalMinutes * 60 * 1000);
  }
}

module.exports = { RedditSentiment };
