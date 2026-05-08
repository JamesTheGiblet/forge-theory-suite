#!/usr/bin/env node
// scripts/optimize.js
// CCE Strategy Optimizer — Rule-Based Analysis Engine
// No external API needed. Reads live databases, applies CCE-specific rules.

'use strict';

require('dotenv').config();
const initSqlJs = require('sql.js');
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// ── DB HELPER ─────────────────────────────────────────────────────────────────
async function queryDb(dbFile, sql) {
  const dbPath = path.join(DATA_DIR, dbFile);
  if (!fs.existsSync(dbPath)) return [];
  try {
    const SQL = await initSqlJs();
    const db  = new SQL.Database(fs.readFileSync(dbPath));
    const r   = db.exec(sql);
    db.close();
    if (!r[0]) return [];
    return r[0].values.map(row =>
      Object.fromEntries(r[0].columns.map((c, i) => [c, row[i]]))
    );
  } catch(e) { return []; }
}

// ── GATHER DATA ───────────────────────────────────────────────────────────────
async function gatherData() {
  const cycles = await queryDb('cce-production.db',
    'SELECT current_state, portfolio_value, btc_price, fear_greed, btc_dominance, total_return, daily_return, timestamp FROM cce_cycles ORDER BY id DESC LIMIT 500'
  );
  const transitions = await queryDb('cce-production.db',
    'SELECT from_state, to_state, COUNT(*) as count FROM state_history GROUP BY from_state, to_state'
  );
  const patterns = await queryDb('obs-production.db',
    'SELECT pattern_type, engine, description, obs_count FROM patterns ORDER BY obs_count DESC LIMIT 20'
  );
  const doubt = await queryDb('fl-production.db',
    'SELECT engine, doubt_score, context_signature, count, avg_regret FROM fl_patterns ORDER BY doubt_score DESC'
  );
  const lessons = await queryDb('fl-production.db',
    'SELECT engine, actual_pnl, best_hypothetical_pnl, regret, alternative_action FROM fl_lessons ORDER BY id DESC LIMIT 20'
  );
  const grid = await queryDb('grid-production.db',
    'SELECT grid_state, total_profit, completed_cycles, btc_price, centre_price FROM grid_cycles ORDER BY id DESC LIMIT 1'
  );
  const mom = await queryDb('mom-production.db',
    'SELECT signal, COUNT(*) as count FROM mom_cycles GROUP BY signal ORDER BY count DESC'
  );

  return { cycles, transitions, patterns, doubt, lessons, grid: grid[0], mom };
}

// ── ANALYSIS RULES ────────────────────────────────────────────────────────────
function analyse(data) {
  const findings = [];
  const suggestions = [];
  const risks = [];

  const { cycles, transitions, doubt, lessons, grid, mom } = data;

  if (!cycles.length) {
    findings.push({ level: 'INFO', msg: 'No cycle data yet — run the engine for at least 24 hours first' });
    return { findings, suggestions, risks };
  }

  // ── DORMANCY ANALYSIS ────────────────────────────────────────────────────
  const stateCounts = {};
  cycles.forEach(c => { stateCounts[c.current_state] = (stateCounts[c.current_state] || 0) + 1; });
  const dormantPct = ((stateCounts.DORMANT || 0) / cycles.length * 100);
  const activePct  = ((stateCounts.IGNITION || 0) + (stateCounts.CASCADE_1 || 0) + (stateCounts.CASCADE_2 || 0)) / cycles.length * 100;

  if (dormantPct > 90) {
    findings.push({ level: 'INFO', msg: `Engine in DORMANT ${dormantPct.toFixed(1)}% of cycles — market conditions unfavourable (normal in bear/fear environments)` });
  } else if (dormantPct > 70) {
    findings.push({ level: 'WARN', msg: `Engine DORMANT ${dormantPct.toFixed(1)}% — consider whether minDormantDays threshold is too conservative` });
    suggestions.push({
      parameter: 'states.minDormantDays',
      current: 30,
      suggested: 21,
      rationale: `High DORMANT rate (${dormantPct.toFixed(1)}%). Reducing minimum dormant days may allow earlier re-entry without increasing risk significantly.`
    });
  }

  // ── FEAR & GREED ANALYSIS ────────────────────────────────────────────────
  const fgValues = cycles.map(c => c.fear_greed).filter(Boolean);
  const avgFG = fgValues.reduce((a,b) => a+b, 0) / fgValues.length;
  const extremeFearCycles = fgValues.filter(v => v < 20).length;
  const extremeFearPct = (extremeFearCycles / fgValues.length * 100);

  findings.push({ level: 'INFO', msg: `Average Fear & Greed: ${avgFG.toFixed(1)} | Extreme Fear cycles: ${extremeFearPct.toFixed(1)}%` });

  if (avgFG < 25) {
    findings.push({ level: 'WARN', msg: `Sustained extreme fear (avg F&G ${avgFG.toFixed(1)}) — engine correctly staying DORMANT. Wait for F&G > 40 before expecting activity.` });
  }

  // ── PORTFOLIO PERFORMANCE ────────────────────────────────────────────────
  const latest  = cycles[0];
  const oldest  = cycles[cycles.length - 1];
  const totalReturn = latest?.total_return || 0;
  const portfolioNow  = latest?.portfolio_value || 0;
  const portfolioThen = oldest?.portfolio_value || 0;
  const actualReturn  = portfolioThen > 0 ? ((portfolioNow - portfolioThen) / portfolioThen * 100) : 0;

  findings.push({ level: 'INFO', msg: `Portfolio: $${portfolioNow.toFixed(2)} | Total return: +${totalReturn.toFixed(1)}% | Observed return: +${actualReturn.toFixed(1)}%` });

  if (totalReturn > 50) {
    findings.push({ level: 'GOOD', msg: `Strong performance: +${totalReturn.toFixed(1)}% — consider whether trailing stop is protecting gains adequately` });
    risks.push(`Trailing stop (${2.1}%) may be too tight during high-momentum moves — could be stopped out prematurely`);
  }

  // ── TRANSITION ANALYSIS ──────────────────────────────────────────────────
  const dormantToWatching = data.transitions.find(t => t.from_state === 'DORMANT' && t.to_state === 'WATCHING');
  const watchingToDormant = data.transitions.find(t => t.from_state === 'WATCHING' && t.to_state === 'DORMANT');
  const watchingToIgnition = data.transitions.find(t => t.from_state === 'WATCHING' && t.to_state === 'IGNITION');

  if (dormantToWatching && watchingToDormant) {
    const failRate = watchingToDormant.count / (dormantToWatching.count || 1) * 100;
    if (failRate > 60) {
      findings.push({ level: 'WARN', msg: `WATCHING → DORMANT failure rate: ${failRate.toFixed(0)}% — conditions frequently building but not completing` });
      suggestions.push({
        parameter: 'strategy.thresholds.accumulationReadySentiment',
        current: 30,
        suggested: 25,
        rationale: `High WATCHING failure rate (${failRate.toFixed(0)}%). Lowering sentiment threshold may allow more transitions to complete in marginal conditions.`
      });
    }
  }

  // ── DOUBT SCORE ANALYSIS ─────────────────────────────────────────────────
  if (doubt.length) {
    const highDoubt = doubt.filter(d => d.doubt_score > 0.5);
    if (highDoubt.length) {
      highDoubt.forEach(d => {
        findings.push({ level: 'WARN', msg: `High doubt score on ${d.engine}: ${d.doubt_score.toFixed(2)} | context: ${d.context_signature} | avg regret: $${d.avg_regret?.toFixed(2)}` });
        suggestions.push({
          parameter: `${d.engine}.entryConditions`,
          current: 'current thresholds',
          suggested: 'tighten entry conditions in this context',
          rationale: `F.L detected doubt score ${d.doubt_score.toFixed(2)} for ${d.engine} in context: ${d.context_signature}. Trades in this context have avg regret $${d.avg_regret?.toFixed(2)}.`
        });
      });
    } else {
      findings.push({ level: 'GOOD', msg: `All doubt scores below 0.5 — no high-regret patterns detected` });
    }
  }

  // ── LESSONS ANALYSIS ─────────────────────────────────────────────────────
  if (lessons.length) {
    const totalRegret = lessons.reduce((a,b) => a + (b.regret || 0), 0);
    const avgRegret   = totalRegret / lessons.length;
    const bestAlt     = lessons.reduce((best, l) => l.regret > best.regret ? l : best, lessons[0]);

    findings.push({ level: 'INFO', msg: `F.L analysed ${lessons.length} trades | avg regret: $${avgRegret.toFixed(2)} | best alternative: ${bestAlt?.alternative_action}` });

    if (avgRegret > 5) {
      suggestions.push({
        parameter: 'Exit timing',
        current: 'current exit rules',
        suggested: `Consider ${bestAlt?.alternative_action} as exit strategy`,
        rationale: `Average regret $${avgRegret.toFixed(2)} per trade. F.L suggests "${bestAlt?.alternative_action}" would have been better in most cases.`
      });
    }
  }

  // ── GRID ANALYSIS ────────────────────────────────────────────────────────
  if (grid) {
    findings.push({ level: 'INFO', msg: `Grid: ${grid.grid_state} | profit: $${grid.total_profit} | cycles: ${grid.completed_cycles} | BTC: $${grid.btc_price?.toFixed(0)} | centre: $${grid.centre_price?.toFixed(0)}` });

    const drift = grid.btc_price && grid.centre_price
      ? Math.abs((grid.btc_price - grid.centre_price) / grid.centre_price * 100)
      : 0;

    if (drift > 3) {
      findings.push({ level: 'WARN', msg: `Grid centre drift: ${drift.toFixed(1)}% — approaching recentre threshold (5%)` });
    }
    if (grid.total_profit === 0 && grid.completed_cycles === 0) {
      findings.push({ level: 'INFO', msg: `Grid has not completed any cycles yet — normal in low-volatility environment` });
    }
  }

  // ── BTC DOMINANCE TREND ──────────────────────────────────────────────────
  const domValues = cycles.slice(0, 20).map(c => c.btc_dominance).filter(Boolean);
  if (domValues.length >= 5) {
    const domTrend = domValues[0] - domValues[domValues.length - 1];
    if (domTrend > 2) {
      findings.push({ level: 'WARN', msg: `BTC dominance rising +${domTrend.toFixed(1)}% — capital flowing TO BTC, alts underperforming. Stay DORMANT.` });
    } else if (domTrend < -2) {
      findings.push({ level: 'GOOD', msg: `BTC dominance falling ${domTrend.toFixed(1)}% — capital rotating OUT of BTC. Watch for IGNITION conditions.` });
    }
  }

  // ── OVERALL RISK ─────────────────────────────────────────────────────────
  if (risks.length === 0) {
    risks.push('No critical risks detected in current configuration');
  }

  return { findings, suggestions, risks };
}

// ── FORMAT REPORT ─────────────────────────────────────────────────────────────
function formatReport(analysis, data) {
  const { findings, suggestions, risks } = analysis;
  const lines = [];

  lines.push('');
  lines.push('═'.repeat(64));
  lines.push('  CCE STRATEGY OPTIMIZER — ANALYSIS REPORT');
  lines.push(`  Generated: ${new Date().toLocaleString()}`);
  lines.push('═'.repeat(64));

  lines.push('\n📊 KEY FINDINGS\n');
  findings.forEach(f => {
    const icon = f.level === 'GOOD' ? '✅' : f.level === 'WARN' ? '⚠️ ' : 'ℹ️ ';
    lines.push(`  ${icon} ${f.msg}`);
  });

  if (suggestions.length) {
    lines.push('\n💡 IMPROVEMENT SUGGESTIONS\n');
    suggestions.forEach((s, i) => {
      lines.push(`  ${i+1}. ${s.parameter}`);
      lines.push(`     Current:   ${s.current}`);
      lines.push(`     Suggested: ${s.suggested}`);
      lines.push(`     Rationale: ${s.rationale}`);
      lines.push('');
    });
  } else {
    lines.push('\n💡 IMPROVEMENT SUGGESTIONS\n');
    lines.push('  No config changes recommended at this time.');
    lines.push('  Platform is performing within expected parameters.');
  }

  lines.push('\n⚠️  RISK ASSESSMENT\n');
  risks.forEach(r => lines.push(`  • ${r}`));

  lines.push('\n🔬 NEXT EXPERIMENT\n');
  if (suggestions.length) {
    const top = suggestions[0];
    lines.push(`  Test: Change ${top.parameter}`);
    lines.push(`  From: ${top.current}`);
    lines.push(`  To:   ${top.suggested}`);
    lines.push(`  How:  Update config.js → pm2 restart cce-bot → observe for 7 days`);
  } else {
    lines.push('  Continue current configuration — insufficient data for changes.');
    lines.push('  Check back after 30+ more cycles.');
  }

  lines.push('\n' + '═'.repeat(64));
  return lines.join('\n');
}

// ── SAVE REPORT ───────────────────────────────────────────────────────────────
function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
  const reportPath = path.join(reportDir, `optimize-${timestamp}.md`);
  fs.writeFileSync(reportPath, report);
  return reportPath;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║   CCE Strategy Optimizer — Rule-Based Analysis Engine          ║
║   No API key required · Giblets Creations                      ║
╚════════════════════════════════════════════════════════════════╝`);

  try {
    console.log('\n📊 Gathering data from live databases...');
    const data = await gatherData();

    console.log(`   Cycles:   ${data.cycles.length}`);
    console.log(`   Patterns: ${data.patterns.length}`);
    console.log(`   Doubts:   ${data.doubt.length}`);
    console.log(`   Lessons:  ${data.lessons.length}`);

    console.log('\n🔍 Running analysis rules...\n');
    const analysis = analyse(data);
    const report   = formatReport(analysis, data);

    console.log(report);

    const reportPath = saveReport(report);
    console.log(`\n✅ Report saved: ${reportPath}`);
    console.log('💡 To apply a suggestion: edit config.js → pm2 restart cce-bot\n');

  } catch(e) {
    console.error('\n❌ Optimizer error:', e.message);
    process.exit(1);
  }
}

main();
