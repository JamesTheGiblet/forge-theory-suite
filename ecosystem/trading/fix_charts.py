with open('/data/data/com.termux/files/home/cce-crypto/public/index.html', 'r') as f:
    content = f.read()

old_init = """function initCharts() {
  const ctx1 = $('chartPortfolio').getContext('2d');
  chartPortfolio = new Chart(ctx1, {
    type:'line',
    data:{labels:[],datasets:[{label:'Portfolio ($)',data:[],borderColor:'#C8922A',backgroundColor:'rgba(200,146,42,.08)',fill:true}]},
    options:{...chartDefaults,scales:{...chartDefaults.scales,y:{...chartDefaults.scales.y,ticks:{...chartDefaults.scales.y.ticks,callback:v=>'$'+v}}}}
  });

  const ctx2 = $('chartBtcFg').getContext('2d');
  chartBtcFg = new Chart(ctx2, {
    type:'line',
    data:{labels:[],datasets:[
      {label:'BTC ($)',data:[],borderColor:'#C8922A',backgroundColor:'transparent',fill:false,yAxisID:'yBtc'},
      {label:'F&G',data:[],borderColor:'#22C55E',backgroundColor:'transparent',fill:false,yAxisID:'yFg'}
    ]},
    options:{...chartDefaults,scales:{
      x:{display:false},
      yBtc:{display:false,position:'left'},
      yFg:{display:false,position:'right'}
    }}
  });
}"""

new_init = """function initCharts() {
  const mk = (id, datasets, yCb) => {
    const el = $(id); if (!el) return null;
    const opts = JSON.parse(JSON.stringify(chartDefaults));
    if (yCb) opts.scales.y.ticks.callback = yCb;
    return new Chart(el.getContext('2d'), {type:'line', data:{labels:[], datasets}, options:opts});
  };
  chartPortfolio = mk('chartPortfolio',
    [{label:'BTC',data:[],borderColor:'#C8922A',backgroundColor:'rgba(200,146,42,.06)',fill:true,spanGaps:false}],
    v => '$' + Number(v).toLocaleString());
  chartBtcFg = mk('chartBtcFg',
    [{label:'F&G',data:[],borderColor:'#22C55E',backgroundColor:'rgba(34,197,94,.06)',fill:true,spanGaps:false}],
    v => v);
  window.chartStocks = mk('chartStocks',
    [{label:'SPY',data:[],borderColor:'#3B82F6',backgroundColor:'transparent',fill:false,spanGaps:false},
     {label:'VIX x10',data:[],borderColor:'#EF4444',backgroundColor:'transparent',fill:false,spanGaps:false}],
    v => v);
  window.chartComo = mk('chartComo',
    [{label:'Oil',data:[],borderColor:'#F59E0B',backgroundColor:'transparent',fill:false,spanGaps:false},
     {label:'Gold/10',data:[],borderColor:'#C8922A',backgroundColor:'transparent',fill:false,spanGaps:false}],
    v => '$' + v);
  window.chartRme = mk('chartRme',
    [{label:'Fed Rate',data:[],borderColor:'#A855F7',backgroundColor:'rgba(168,85,247,.06)',fill:true,spanGaps:false},
     {label:'10Y',data:[],borderColor:'#06B6D4',backgroundColor:'transparent',fill:false,spanGaps:false}],
    v => v + '%');
  window.chartDom = mk('chartDom',
    [{label:'BTC Dom',data:[],borderColor:'#C8922A',backgroundColor:'rgba(200,146,42,.06)',fill:true,spanGaps:false}],
    v => v + '%');
}"""

import re

content = content.replace(old_init, new_init)

new_hist = """async function loadHistory() {
  try {
    const r = await fetch('/api/history/all?limit=50');
    if (!r.ok) return;
    const d = await r.json();
    const lbl = arr => arr.map(x => new Date(x.timestamp).toLocaleDateString('en-GB',{month:'short',day:'numeric'}));
    if (chartPortfolio && d.cce && d.cce.length) {
      chartPortfolio.data.labels = lbl(d.cce);
      chartPortfolio.data.datasets[0].data = d.cce.map(x => x.btc_price > 0 ? x.btc_price : null);
      chartPortfolio.update('none');
    }
    if (chartBtcFg && d.cce && d.cce.length) {
      chartBtcFg.data.labels = lbl(d.cce);
      chartBtcFg.data.datasets[0].data = d.cce.map(x => x.fear_greed > 0 ? x.fear_greed : null);
      chartBtcFg.update('none');
    }
    if (window.chartStocks && d.cme && d.cme.length) {
      window.chartStocks.data.labels = lbl(d.cme);
      window.chartStocks.data.datasets[0].data = d.cme.map(x => x.spy_price > 0 ? x.spy_price : null);
      window.chartStocks.data.datasets[1].data = d.cme.map(x => x.vix > 0 ? x.vix * 10 : null);
      window.chartStocks.update('none');
    }
    if (window.chartComo && d.como && d.como.length) {
      window.chartComo.data.labels = lbl(d.como);
      window.chartComo.data.datasets[0].data = d.como.map(x => x.oil_price > 0 ? x.oil_price : null);
      window.chartComo.data.datasets[1].data = d.como.map(x => x.gold_price > 0 ? x.gold_price / 10 : null);
      window.chartComo.update('none');
    }
    if (window.chartRme && d.rme && d.rme.length) {
      window.chartRme.data.labels = lbl(d.rme);
      window.chartRme.data.datasets[0].data = d.rme.map(x => x.fed_rate > 0 ? x.fed_rate : null);
      window.chartRme.data.datasets[1].data = d.rme.map(x => x.treasury_yield > 0 ? x.treasury_yield : null);
      window.chartRme.update('none');
    }
    if (window.chartDom && d.cce && d.cce.length) {
      window.chartDom.data.labels = lbl(d.cce);
      window.chartDom.data.datasets[0].data = d.cce.map(x => x.btc_dominance > 0 ? x.btc_dominance : null);
      window.chartDom.update('none');
    }
  } catch(e) { console.warn('History error:', e.message); }
}"""

content = re.sub(r'async function loadHistory\(\) \{.*?\n\}', new_hist, content, flags=re.DOTALL)

with open('/data/data/com.termux/files/home/cce-crypto/public/index.html', 'w') as f:
    f.write(content)

print('initCharts OK:', 'window.chartStocks' in content)
print('loadHistory OK:', 'history/all' in content)
