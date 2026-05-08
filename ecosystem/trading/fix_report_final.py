f = open('scripts/generate-report.js', 'r')
c = f.read()
f.close()

old = """  // EGP section
  
  lines.push('PLATFORM SUMMARY');"""

new = """  // EGP section
  lines.push('');
  lines.push('8. S.E EGP — DRY RUN');
  lines.push('-'.repeat(70));
  if (egp) {
    lines.push(`Period:          ${ts(egp.firstCycle)} -> ${ts(egp.lastCycle)}`);
    lines.push(`Total cycles:    ${egp.totalCycles}`);
    lines.push(`Current state:   ${egp.currentState}`);
    lines.push(`Composite score: ${egp.compositeScore}`);
    lines.push(`Divergence flag: ${egp.divergenceFlag ? 'YES' : 'no'}`);
    lines.push('');
    lines.push(`CBE Rate:        ${egp.cbeRate}% (delta: ${egp.cbeRateDelta}%)`);
    lines.push(`Inflation:       ${egp.inflation}% (delta: ${egp.inflationDelta}%)`);
    lines.push(`Reserves:        $${egp.reserves}bn`);
    lines.push(`Brent:           $${egp.brentLevel}`);
    lines.push(`USD/EGP:         ${egp.usdEgpRate || '--'}`);
    lines.push(`Next CBE mtg:    ${egp.nextCbeMeeting}`);
    lines.push('');
    lines.push('State distribution:');
    Object.entries(egp.stateCounts || {}).forEach(([s, cnt]) => {
      lines.push(`  ${s.padEnd(16)} ${cnt} cycles (${(cnt/egp.totalCycles*100).toFixed(1)}%)`);
    });
  } else {
    lines.push('No data yet');
  }

  lines.push('PLATFORM SUMMARY');"""

c = c.replace(old, new)

# Also fix platform summary to include new engines
c = c.replace(
    "  lines.push(`T.E Grid:        DRY RUN | State: ${grid?.gridState || '--'} | Profit: $${grid?.totalProfit || '0.000000'}`);",
    """  lines.push(`T.E Grid:        DRY RUN | State: ${grid?.gridState || '--'} | Profit: $${grid?.totalProfit || '0.000000'}`);
  lines.push(`T.E Momentum:    DRY RUN | Trades: ${mom?.totalTrades || 0} | PnL: +$${mom?.totalProfit || '0.0000'}`);
  lines.push(`T.E Breakout:    DRY RUN | Squeezes: ${brk?.squeezeCount || 0} | Trades: ${brk?.totalTrades || 0}`);
  lines.push(`S.E EGP:         DRY RUN | State: ${egp?.currentState || '--'} | Divergence: ${egp?.divergenceFlag ? 'YES' : 'no'}`);"""
)

f = open('scripts/generate-report.js', 'w')
f.write(c)
f.close()
print('done')
