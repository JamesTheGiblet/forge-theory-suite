async function getStats() {
  try {
    const fetch = await import('node-fetch');
    const res = await fetch.default('http://localhost:3001/api/stats');
    return await res.json();
  } catch(e) {
    return { strategies: 0, breaches: 0, paperHours: 48, vix: 30 };
  }
}

module.exports = { getStats };
