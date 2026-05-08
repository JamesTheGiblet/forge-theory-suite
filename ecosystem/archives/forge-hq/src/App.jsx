import { useState, useEffect } from 'react'

const API = '/api'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Oswald:wght@300;400;600;700&family=Rajdhani:wght@300;400;600;700&display=swap');

  :root {
    --bg: #080808; --surface: #0e0e0e; --surface2: #141414;
    --border: #2a2a2a; --border2: #1a1a1a;
    --chrome: #9a9a9a; --chrome2: #c8c8c8;
    --gold: #c8972a; --gold2: #f0b840;
    --green: #3ddc84; --red: #ff4757; --blue: #4488ff; --amber: #ff9f1c;
    --dim: #444; --dimmer: #2a2a2a;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin:0; padding:0; }
  body {
    background: var(--bg); color: var(--chrome);
    font-family: 'Rajdhani', sans-serif; font-weight: 400; overflow-x: hidden;
  }
  body::before {
    content:''; position:fixed; inset:0;
    background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);
    pointer-events:none; z-index:9999;
  }
  .hdr {
    position:sticky; top:0; z-index:100;
    background: linear-gradient(180deg,#0c0c0c 0%,#080808 100%);
    border-bottom:1px solid var(--border);
    padding:12px 16px; display:flex; justify-content:space-between; align-items:center;
  }
  .hdr::after {
    content:''; position:absolute; bottom:-2px; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,var(--gold),transparent); opacity:0.4;
  }
  .logo-text {
    font-family:'Oswald',sans-serif; font-weight:700; font-size:22px; letter-spacing:4px;
    background:linear-gradient(135deg,var(--gold) 0%,var(--gold2) 50%,var(--gold) 100%);
    -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  }
  .logo-sub { font-family:'Share Tech Mono',monospace; font-size:9px; letter-spacing:3px; color:var(--dim); margin-top:1px; }
  .live-badge {
    display:flex; align-items:center; gap:6px;
    background:rgba(61,220,132,0.08); border:1px solid rgba(61,220,132,0.2); border-radius:2px; padding:4px 8px;
  }
  .live-dot {
    width:6px; height:6px; border-radius:50%;
    background:var(--green); box-shadow:0 0 6px var(--green);
    animation:blink 2s ease-in-out infinite;
  }
  .live-text { font-family:'Share Tech Mono',monospace; font-size:10px; color:var(--green); letter-spacing:2px; }
  @keyframes blink { 0%,100%{opacity:1;box-shadow:0 0 6px var(--green)} 50%{opacity:0.3;box-shadow:none} }
  .content { padding:16px; padding-bottom:90px; }
  .sec-hdr { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .sec-line { flex:1; height:1px; background:linear-gradient(90deg,var(--border),transparent); }
  .sec-title { font-family:'Oswald',sans-serif; font-weight:600; font-size:11px; letter-spacing:4px; color:var(--gold); text-transform:uppercase; }
  .card {
    background:var(--surface); border:1px solid var(--border); border-radius:3px;
    padding:14px; position:relative; overflow:hidden; margin-bottom:10px;
  }
  .card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,var(--dimmer),var(--border),var(--dimmer),transparent);
  }
  .card-green::after { content:''; position:absolute; top:0; left:0; width:2px; height:100%; background:var(--green); box-shadow:0 0 8px var(--green); }
  .card-gold::after  { content:''; position:absolute; top:0; left:0; width:2px; height:100%; background:var(--gold); box-shadow:0 0 8px var(--gold); }
  .card-blue::after  { content:''; position:absolute; top:0; left:0; width:2px; height:100%; background:var(--blue); box-shadow:0 0 6px var(--blue); }
  .card-red::after   { content:''; position:absolute; top:0; left:0; width:2px; height:100%; background:var(--red); box-shadow:0 0 8px var(--red); }
  .data-label { font-family:'Share Tech Mono',monospace; font-size:9px; letter-spacing:2px; color:var(--dim); text-transform:uppercase; margin-bottom:4px; }
  .data-xl { font-family:'Oswald',sans-serif; font-weight:700; font-size:32px; line-height:1; }
  .data-lg { font-family:'Oswald',sans-serif; font-weight:600; font-size:22px; line-height:1; }
  .data-sm { font-family:'Share Tech Mono',monospace; font-size:13px; }
  .gold{color:var(--gold2)!important} .green{color:var(--green)!important} .red{color:var(--red)!important}
  .blue{color:var(--blue)!important} .amber{color:var(--amber)!important} .dim{color:var(--dim)!important} .chrome{color:var(--chrome2)!important}
  .state-badge { font-family:'Share Tech Mono',monospace; font-size:10px; letter-spacing:2px; padding:3px 8px; border-radius:2px; border:1px solid; }
  .s-dim    { color:var(--dim);   border-color:var(--dimmer); background:rgba(42,42,42,0.3); }
  .s-green  { color:var(--green); border-color:rgba(61,220,132,0.3); background:rgba(61,220,132,0.08); }
  .s-amber  { color:var(--amber); border-color:rgba(255,159,28,0.3); background:rgba(255,159,28,0.08); }
  .s-red    { color:var(--red);   border-color:rgba(255,71,87,0.3);  background:rgba(255,71,87,0.08); }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
  .stat-box { background:var(--surface2); border:1px solid var(--border2); border-radius:2px; padding:10px; text-align:center; }
  .divider  { height:1px; background:var(--border2); margin:10px 0; }
  .progress-track { height:4px; background:var(--border2); border-radius:2px; overflow:hidden; margin-top:10px; }
  .progress-fill  { height:100%; background:linear-gradient(90deg,var(--gold),var(--gold2)); box-shadow:0 0 8px var(--gold); transition:width 0.6s ease; }
  .printer-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border2); }
  .printer-row:last-child { border-bottom:none; }
  .toggle-group { display:flex; gap:3px; }
  .tbtn { font-family:'Share Tech Mono',monospace; font-size:8px; letter-spacing:1px; padding:3px 5px; border-radius:2px; border:1px solid var(--border2); background:transparent; color:var(--dim); cursor:pointer; }
  .tbtn-offline { border-color:var(--dim)!important; color:var(--chrome)!important; background:rgba(100,100,100,0.1)!important; }
  .tbtn-idle    { border-color:var(--blue)!important; color:var(--blue)!important; background:rgba(68,136,255,0.1)!important; }
  .tbtn-printing{ border-color:var(--green)!important; color:var(--green)!important; background:rgba(61,220,132,0.1)!important; }
  .bottom-nav {
    position:fixed; bottom:0; left:0; right:0;
    background:linear-gradient(0deg,#060606 0%,#0a0a0a 100%);
    border-top:1px solid var(--border);
    padding:8px 12px calc(8px + env(safe-area-inset-bottom));
    display:flex; gap:6px;
  }
  .bottom-nav::before {
    content:''; position:absolute; top:-1px; left:0; right:0; height:1px;
    background:linear-gradient(90deg,transparent,var(--gold),transparent); opacity:0.3;
  }
  .nav-btn { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 4px; border-radius:3px; border:1px solid transparent; background:transparent; cursor:pointer; position:relative; transition:all 0.2s; }
  .nav-btn.active { background:rgba(200,151,42,0.08); border-color:rgba(200,151,42,0.25); }
  .nav-btn.active::before { content:''; position:absolute; top:0; left:20%; right:20%; height:1px; background:var(--gold); box-shadow:0 0 6px var(--gold); }
  .nav-icon { font-size:16px; line-height:1; }
  .nav-label { font-family:'Share Tech Mono',monospace; font-size:8px; letter-spacing:2px; color:var(--dim); text-transform:uppercase; }
  .nav-btn.active .nav-label { color:var(--gold); }
  .forge-input { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:2px; padding:10px 12px; font-family:'Share Tech Mono',monospace; font-size:12px; color:var(--chrome2); margin-bottom:8px; outline:none; transition:border-color 0.2s; }
  .forge-input:focus { border-color:var(--gold); }
  .forge-input::placeholder { color:var(--dim); }
  .forge-select { width:100%; background:var(--bg); border:1px solid var(--border); border-radius:2px; padding:10px 12px; font-family:'Share Tech Mono',monospace; font-size:12px; color:var(--chrome2); margin-bottom:8px; outline:none; }
  .btn-primary { flex:1; background:rgba(200,151,42,0.12); border:1px solid rgba(200,151,42,0.35); border-radius:2px; padding:10px; font-family:'Share Tech Mono',monospace; font-size:11px; letter-spacing:2px; color:var(--gold2); cursor:pointer; }
  .btn-ghost   { flex:1; background:transparent; border:1px solid var(--border); border-radius:2px; padding:10px; font-family:'Share Tech Mono',monospace; font-size:11px; letter-spacing:2px; color:var(--dim); cursor:pointer; }
  .btn-add { width:100%; background:transparent; border:1px dashed var(--border); border-radius:3px; padding:12px; font-family:'Share Tech Mono',monospace; font-size:11px; letter-spacing:3px; color:var(--dim); cursor:pointer; transition:all 0.2s; margin-top:4px; }
  .btn-add:hover { border-color:var(--gold); color:var(--gold); }
  .inv-item { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:var(--surface); border:1px solid var(--border2); border-radius:3px; margin-bottom:6px; }
  .ticker-row { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border2); }
  .ticker-row:last-child { border-bottom:none; }
  .diamond { width:5px; height:5px; background:var(--gold); transform:rotate(45deg); box-shadow:0 0 6px var(--gold); flex-shrink:0; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
`

function useApi(endpoint, ms=30000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const go = async () => {
      try { const r = await fetch(API+endpoint); setData(await r.json()) }
      catch(e){} finally { setLoading(false) }
    }
    go()
    const t = setInterval(go, ms)
    return () => clearInterval(t)
  }, [endpoint])
  return { data, loading }
}

function injectStyles() {
  if (document.getElementById('forge-styles')) return
  const s = document.createElement('style'); s.id = 'forge-styles'; s.textContent = css
  document.head.appendChild(s)
  const l = document.createElement('link'); l.rel='stylesheet'
  l.href='https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Oswald:wght@300;400;600;700&family=Rajdhani:wght@300;400;600;700&display=swap'
  document.head.appendChild(l)
}

function stateClass(s) {
  if (!s) return 's-dim'
  if (['IGNITION','CASCADE_1','CASCADE_2','EXECUTE','MONITOR'].includes(s)) return 's-green'
  if (['ACCUMULATION','ANCHOR','OBSERVE','ANALYSE'].includes(s)) return 's-amber'
  if (['EXTRACTION','SPILLWAY'].includes(s)) return 's-red'
  return 's-dim'
}

function SecHdr({title}) {
  return <div className="sec-hdr">
    <div className="diamond"/>
    <span className="sec-title">{title}</span>
    <div className="sec-line"/>
  </div>
}

// ── CCE ───────────────────────────────────────────────────────────────────────
function CCEPanel() {
  const {data, loading} = useApi('/cce/status', 30000)
  const [time, setTime] = useState(new Date())
  useEffect(()=>{ const t=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(t) },[])
  const crypto = data?.crypto, forex = data?.forex

  return <div className="fade-in">
    <SecHdr title="CCE PLATFORM"/>

    <div className={`card ${crypto ? 'card-green' : 'card-blue'}`}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div className="data-label">CRYPTO · KRAKEN · LIVE</div>
          <div className={`data-xl ${crypto ? 'gold' : 'dim'}`}>
            {loading ? '···' : crypto ? `$${crypto.portfolio?.toFixed(2)}` : 'LOADING'}
          </div>
        </div>
        <span className={`state-badge ${stateClass(crypto?.state)}`}>{crypto?.state||'AWAIT'}</span>
      </div>
      {crypto && <div className="grid3">
        <div className="stat-box"><div className="data-label">BTC</div><div className="data-sm chrome">$${crypto.btc_price?.toLocaleString()}</div></div>
        <div className="stat-box"><div className="data-label">F&G</div><div className={`data-sm ${(crypto.fear_greed||50)<25?'red':(crypto.fear_greed||50)>75?'green':''}`}>{crypto.fear_greed}</div></div>
        <div className="stat-box"><div className="data-label">RTN</div><div className={`data-sm ${(crypto.total_return||0)>=0?'green':'red'}`}>{crypto.total_return?.toFixed(2)}%</div></div>
      </div>}
      {!crypto && !loading && <div className="data-label" style={{marginTop:8}}>Awaiting next 4H cycle...</div>}
    </div>

    <div className={`card ${forex?.state==='EXECUTE'||forex?.state==='MONITOR' ? 'card-green' : 'card-blue'}`}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div>
          <div className="data-label">FOREX · EUR/USD · DRY RUN</div>
          <div className={`data-xl ${forex ? 'gold' : 'dim'}`}>
            {loading ? '···' : forex ? `£${forex.portfolio?.toFixed(2)}` : 'LOADING'}
          </div>
        </div>
        <span className={`state-badge ${stateClass(forex?.state)}`}>{forex?.state||'AWAIT'}</span>
      </div>
      {forex && <div className="grid3">
        <div className="stat-box"><div className="data-label">PRICE</div><div className="data-sm chrome">{forex.price}</div></div>
        <div className="stat-box"><div className="data-label">Z</div><div className={`data-sm ${(forex.z_score||0)<=-1.5?'amber':''}`}>{forex.z_score?.toFixed(3)}</div></div>
        <div className="stat-box"><div className="data-label">RSI</div><div className={`data-sm ${(forex.rsi||50)<35?'amber':''}`}>{forex.rsi?.toFixed(1)}</div></div>
      </div>}
      {!forex && !loading && <div className="data-label" style={{marginTop:8}}>Awaiting London session...</div>}
    </div>

    <div style={{textAlign:'center',fontFamily:'Share Tech Mono',fontSize:11,color:'var(--dim)',letterSpacing:3,marginTop:8}}>
      {time.toUTCString().slice(17,25)} UTC
    </div>
  </div>
}

// ── INVENTORY ─────────────────────────────────────────────────────────────────
function InventoryPanel() {
  const {data} = useApi('/inventory', 60000)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({name:'',qty_ready:0,price_gbp:0,sla_or_fdm:'fdm'})
  const [tick, setTick] = useState(0)

  const submit = async () => {
    await fetch('/api/inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    setAdding(false); setForm({name:'',qty_ready:0,price_gbp:0,sla_or_fdm:'fdm'}); setTick(t=>t+1)
  }

  const total = data?.reduce((a,b)=>a+(b.qty_ready||0),0)||0
  const low   = data?.filter(i=>i.qty_ready<=2)||[]
  const val   = data?.reduce((a,b)=>a+((b.qty_ready||0)*(b.price_gbp||0)),0)||0

  return <div className="fade-in">
    <SecHdr title="STOCK INVENTORY"/>
    <div className="grid3" style={{marginBottom:10}}>
      <div className="stat-box"><div className="data-label">READY</div><div className="data-xl gold">{total}</div></div>
      <div className="stat-box"><div className="data-label">LOW</div><div className={`data-xl ${low.length>0?'red':'dim'}`}>{low.length}</div></div>
      <div className="stat-box"><div className="data-label">VALUE</div><div className="data-lg green">£{val.toFixed(0)}</div></div>
    </div>

    {(data||[]).map(item=>(
      <div key={item.id} className="inv-item">
        <div>
          <div style={{fontFamily:'Rajdhani',fontWeight:600,fontSize:16,color:'var(--chrome2)'}}>{item.name}</div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:9,color:'var(--dim)',marginTop:2}}>£{item.price_gbp} · {item.sla_or_fdm?.toUpperCase()}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'Oswald',fontWeight:700,fontSize:28,color:'var(--gold2)',lineHeight:1}}>{item.qty_ready}</div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:8,letterSpacing:2,color:'var(--dim)'}}>READY</div>
        </div>
      </div>
    ))}

    {adding ? <div className="card card-gold">
      <div className="data-label" style={{marginBottom:12}}>NEW ITEM</div>
      <input className="forge-input" placeholder="Model name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
      <div className="grid2">
        <input className="forge-input" placeholder="Qty" type="number" value={form.qty_ready} onChange={e=>setForm({...form,qty_ready:parseInt(e.target.value)||0})}/>
        <input className="forge-input" placeholder="£ Price" type="number" value={form.price_gbp} onChange={e=>setForm({...form,price_gbp:parseFloat(e.target.value)||0})}/>
      </div>
      <select className="forge-select" value={form.sla_or_fdm} onChange={e=>setForm({...form,sla_or_fdm:e.target.value})}>
        <option value="fdm">FDM</option><option value="sla">SLA / RESIN</option>
      </select>
      <div style={{display:'flex',gap:8,marginTop:4}}>
        <button className="btn-primary" onClick={submit}>CONFIRM</button>
        <button className="btn-ghost" onClick={()=>setAdding(false)}>CANCEL</button>
      </div>
    </div> : <button className="btn-add" onClick={()=>setAdding(true)}>+ ADD ITEM</button>}
  </div>
}

// ── PRINTERS ─────────────────────────────────────────────────────────────────
function PrintersPanel() {
  const {data} = useApi('/printers', 20000)
  const [, setTick] = useState(0)

  const update = async (id, status) => {
    await fetch(`/api/printers/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})})
    setTick(t=>t+1)
  }

  const printing = data?.filter(p=>p.status==='printing').length||0
  const idle     = data?.filter(p=>p.status==='idle').length||0
  const offline  = data?.filter(p=>p.status==='offline').length||0

  return <div className="fade-in">
    <SecHdr title="PRINTER FLEET"/>
    <div className="grid3" style={{marginBottom:10}}>
      <div className="stat-box"><div className="data-label">RUNNING</div><div className="data-xl green">{printing}</div></div>
      <div className="stat-box"><div className="data-label">IDLE</div><div className="data-xl blue">{idle}</div></div>
      <div className="stat-box"><div className="data-label">OFFLINE</div><div className="data-xl dim">{offline}</div></div>
    </div>
    <div className="card">
      {(data||[]).map(p=>(
        <div key={p.id} className="printer-row">
          <div>
            <div style={{fontFamily:'Rajdhani',fontWeight:600,fontSize:15,color:p.status==='printing'?'var(--green)':p.status==='idle'?'var(--blue)':'var(--dim)'}}>{p.name}</div>
            <div style={{fontFamily:'Share Tech Mono',fontSize:9,color:'var(--dim)',marginTop:1}}>{p.current_job||'NO JOB'}</div>
          </div>
          <div className="toggle-group">
            {['offline','idle','printing'].map(s=>(
              <button key={s} className={`tbtn ${p.status===s?'tbtn-'+s:''}`} onClick={()=>update(p.id,s)}>
                {s==='printing'?'PRINT':s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
}

// ── FINANCE ──────────────────────────────────────────────────────────────────
function FinancePanel() {
  const {data} = useApi('/finance/summary', 60000)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({source:'',amount_gbp:0})
  const [, setTick] = useState(0)

  const submit = async () => {
    await fetch('/api/finance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,type:'income'})})
    setAdding(false); setForm({source:'',amount_gbp:0}); setTick(t=>t+1)
  }

  const mrr = data?.mrr||0, target=data?.target||4000
  const pct = Math.min(100,(mrr/target)*100)

  return <div className="fade-in">
    <SecHdr title="REVENUE"/>
    <div className="card card-gold">
      <div className="grid2" style={{marginBottom:14}}>
        <div><div className="data-label">MRR · 30 DAYS</div><div className="data-xl gold">£{mrr.toFixed(0)}</div></div>
        <div style={{textAlign:'right'}}><div className="data-label">TARGET</div><div className="data-lg dim">£{target.toLocaleString()}</div></div>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{width:pct+'%'}}/></div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
        <span style={{fontFamily:'Share Tech Mono',fontSize:9,color:'var(--dim)'}}>{pct.toFixed(1)}% OF TARGET</span>
        <span style={{fontFamily:'Share Tech Mono',fontSize:9,color:'var(--dim)'}}>£{(target-mrr).toFixed(0)} TO GO</span>
      </div>
    </div>

    {(data?.breakdown?.length>0) && <div className="card">
      <div className="data-label" style={{marginBottom:10}}>BREAKDOWN · 30D</div>
      {data.breakdown.map((b,i)=>(
        <div key={i} className="ticker-row">
          <span style={{fontFamily:'Rajdhani',fontWeight:600,fontSize:14,color:'var(--chrome)'}}>{b.source}</span>
          <span style={{fontFamily:'Oswald',fontWeight:600,fontSize:18,color:'var(--gold2)'}}>£{b.total?.toFixed(2)}</span>
        </div>
      ))}
    </div>}

    {adding ? <div className="card card-gold">
      <div className="data-label" style={{marginBottom:12}}>LOG INCOME</div>
      <input className="forge-input" placeholder="Source (Etsy, eBay, CCE...)" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}/>
      <input className="forge-input" placeholder="Amount £" type="number" value={form.amount_gbp} onChange={e=>setForm({...form,amount_gbp:parseFloat(e.target.value)||0})}/>
      <div style={{display:'flex',gap:8,marginTop:4}}>
        <button className="btn-primary" onClick={submit}>LOG IT</button>
        <button className="btn-ghost" onClick={()=>setAdding(false)}>CANCEL</button>
      </div>
    </div> : <button className="btn-add" onClick={()=>setAdding(true)}>+ LOG INCOME</button>}
  </div>
}

// ── APP ──────────────────────────────────────────────────────────────────────
const TABS = [
  {id:'cce',icon:'📡',label:'CCE'},
  {id:'inventory',icon:'📦',label:'STOCK'},
  {id:'printers',icon:'⚙',label:'PRINT'},
  {id:'finance',icon:'◈',label:'REVENUE'},
]

export default function App() {
  injectStyles()
  const [tab, setTab] = useState('cce')
  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <div className="hdr">
        <div>
          <div className="logo-text">THE FORGE HQ</div>
          <div className="logo-sub">Giblets Creations · Master Control</div>
        </div>
        <div className="live-badge"><div className="live-dot"/><span className="live-text">LIVE</span></div>
      </div>
      <div className="content">
        {tab==='cce'       && <CCEPanel/>}
        {tab==='inventory' && <InventoryPanel/>}
        {tab==='printers'  && <PrintersPanel/>}
        {tab==='finance'   && <FinancePanel/>}
      </div>
      <div className="bottom-nav">
        {TABS.map(t=>(
          <button key={t.id} className={`nav-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>
            <span className="nav-icon">{t.icon}</span>
            <span className="nav-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
