'use strict';

// ═══════════════════════════════════════════════════
// LENS DEFINITIONS
// ═══════════════════════════════════════════════════
const LENSES = {
  fact:    { key:'fact',    icon:'◈', name:'FACT',      desc:'Objective, verifiable statement',         color:'#00d4ff', face:'fr', hint:'The prime truth. What is known.' },
  counter: { key:'counter', icon:'⊘', name:'COUNTER',   desc:'Refutation or opposing argument',         color:'#ff4e4e', face:'bk', hint:'The challenge. What pushes back.' },
  opinion: { key:'opinion', icon:'◎', name:'OPINION',   desc:'Personal or cultural perspective',        color:'#a855f7', face:'lt', hint:'The view. What someone believes.' },
  fiction: { key:'fiction', icon:'◇', name:'FICTION',   desc:'Speculative, narrative or imagined take',  color:'#f59e0b', face:'rt', hint:'The story. What could be imagined.' },
  context: { key:'context', icon:'⊡', name:'CONTEXT',   desc:'Historical, scientific or wider setting',  color:'#10b981', face:'tp', hint:'The frame. Where it sits in time or space.' },
  unknown: { key:'unknown', icon:'?', name:'UNKNOWN',   desc:'What remains unknown or unresolved',       color:'#6b7a99', face:'bt', hint:'The gap. What we do not yet know.' },
};
const LENS_ORDER = ['fact','counter','opinion','fiction','context','unknown'];
const FACE_TO_LENS = Object.fromEntries(LENS_ORDER.map(k=>[ LENSES[k].face, k ]));
const LENS_TO_FACE = Object.fromEntries(LENS_ORDER.map(k=>[ k, LENSES[k].face ]));

// ═══════════════════════════════════════════════════
// RULE-BASED CLASSIFIER
// ═══════════════════════════════════════════════════
const STOPWORDS = new Set(['a','an','the','is','it','its','in','on','at','to','of','for','and','or','but','with','by','from','as','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','their','they','we','us','our','i','my','you','your','he','she','him','her','his','which','who','what','when','where','how','than','then','so','if','not','no','only','also','just','about','into','through','during','before','after','above','below','between','such','more','most','other','some','any','all','each','both','few','many','much','very','too','s','t','re','ve','ll','d','m']);

// Lens-suggesting keyword rules
const LENS_HINTS = {
  counter: ['however','but','wrong','false','actually','contrary','dispute','refute','incorrect','argument','against','disagree','myth','debunk','oppose','challenge'],
  opinion: ['think','believe','feel','seems','perhaps','arguably','perspective','view','opinion','suggest','should','might','could','consider','personally','many','some people'],
  fiction: ['imagine','story','tale','what if','suppose','fiction','novel','character','narrative','universe','world','dream','fantasy','legend','myth','speculative','sci-fi'],
  context: ['history','historical','ancient','century','background','origin','context','because','since','during','era','period','traditionally','science','research','study','discovered'],
  unknown: ['unknown','unclear','mystery','uncertain','unsolved','question','wonder','perhaps','maybe','possibly','hypothesis','theory','yet','still','remains','unresolved','enigma'],
};

function tokenise(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOPWORDS.has(w));
  const bigrams = [];
  for(let i=0;i<words.length-1;i++) if(!STOPWORDS.has(words[i])&&!STOPWORDS.has(words[i+1])) bigrams.push(words[i]+'_'+words[i+1]);
  return { words, bigrams, all:[...words,...bigrams] };
}

function feedMemory(mem,tokens) { for(const t of tokens.all) mem.set(t,(mem.get(t)||0)+1); }

function scoreSimilarity(tokens, mem) {
  if(!mem.size) return 0;
  let w=0;
  for(const t of tokens.all) if(mem.has(t)) w+=t.includes('_')?2:1;
  for(const word of tokens.words) { const root=word.slice(0,5); for(const [mt] of mem) if(!mt.includes('_')&&mt.slice(0,5)===root&&!tokens.all.includes(mt)) w+=0.5; }
  const max=tokens.all.length*2+tokens.words.length;
  return max>0?Math.min(1,w/Math.max(max*0.4,3)):0;
}

// Suggest which lens a piece of text should go on, based on language cues
function suggestLens(text) {
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  for(const [lens, hints] of Object.entries(LENS_HINTS)) {
    const score = hints.filter(h=>lower.includes(h)).length;
    if(score>bestScore) { bestScore=score; best=lens; }
  }
  return bestScore>0 ? best : null;
}

function deriveTopicLabel(mem, existing='') {
  if(existing&&existing!=='NEW NODE'&&existing!=='INITIALISING') return existing;
  const sorted=[...mem.entries()].filter(([t])=>!t.includes('_')).sort((a,b)=>b[1]-a[1]);
  return sorted.slice(0,3).map(([t])=>t).join(' ').toUpperCase().slice(0,22)||'DATA NODE';
}

function classifyToNode(text, nodes) {
  const tokens=tokenise(text);
  const candidates=[];
  for(const node of nodes) {
    const score=scoreSimilarity(tokens,node.memory);
    if(score>0.08) candidates.push({nodeId:node.id,score,label:node.topic});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return {tokens,candidates};
}

// ═══════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════
const STORAGE_KEY='datacube_v3';
function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY,JSON.stringify({nextId,totalEntries,nodes:nodes.map(n=>({id:n.id,topic:n.topic,entries:n.entries,memory:[...n.memory.entries()],position:n.position,velocity:n.velocity, notes: n.notes || [], locked: n.locked}))}));
  }catch(e){}
  // refresh open panels live
  if(document.getElementById('layer-panel').classList.contains('open')){ buildLayerTabs(); renderLayerCards(activeLayerTab); }
  if(document.getElementById('search-panel').classList.contains('open')) runSearch();
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return false;
    const data=JSON.parse(raw);
    nextId=data.nextId||0; totalEntries=data.totalEntries||0;
    for(const nd of data.nodes){
      const node={id:nd.id,topic:nd.topic,entries:nd.entries,memory:new Map(nd.memory),el:null,position:nd.position||{x:(Math.random()-0.5)*40,y:(Math.random()-0.5)*40,z:(Math.random()-0.5)*40},velocity:nd.velocity||{x:0,y:0,z:0}, notes: nd.notes || [], locked: nd.locked || false};
      nodes.push(node);
      const el=createCubeEl(node);
      el.style.transform=`translate3d(${node.position.x-75}px,${node.position.y-75}px,${node.position.z}px)`;
    }
    updateMeta(); return true;
  }catch(e){return false;}
}

// ═══════════════════════════════════════════════════
// DATA MODEL
// ═══════════════════════════════════════════════════
let nodes=[], nextId=0, totalEntries=0, focusedNode=null, IS_REMOTE_ACTION = false, selectedCubes = new Set(), similarityCache = new Map();

function makeNode(topic=''){
  return {id:nextId++,topic,entries:[],memory:new Map(),el:null,position:{x:(Math.random()-0.5)*40,y:(Math.random()-0.5)*40,z:(Math.random()-0.5)*40},velocity:{x:0,y:0,z:0}, notes: [], locked: false};
}
function getLensEntry(node, lensKey) {
  return node.entries.find(e=>e.lens===lensKey);
}
function getFreeLenses(node) {
  return LENS_ORDER.filter(k=>!getLensEntry(node,k));
}

// ═══════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════
function toggleSelect(node, isMultiSelect) {
  if (!isMultiSelect) {
    const wasOnlySelection = selectedCubes.size === 1 && selectedCubes.has(node.id);
    selectedCubes.clear();
    if (!wasOnlySelection) {
      selectedCubes.add(node.id);
    }
  } else {
    if (selectedCubes.has(node.id)) {
      selectedCubes.delete(node.id);
    } else {
      selectedCubes.add(node.id);
    }
  }
  updateSelectionVisuals();
  updateBatchPanel();
}

function updateSelectionVisuals() {
  nodes.forEach(n => {
    if (n.el) {
      const body = n.el.querySelector('.cube-body');
      body.classList.toggle('selected', selectedCubes.has(n.id));
    }
  });
}

function updateBatchPanel() {
  const panel = document.getElementById('batch-panel');
  const countEl = document.getElementById('batch-count');
  const count = selectedCubes.size;

  if (count > 0) {
    countEl.textContent = `${count} CUBE${count > 1 ? 'S' : ''} SELECTED`;
    panel.classList.add('visible');
  } else {
    panel.classList.remove('visible');
  }
  document.getElementById('batch-merge-btn').disabled = count < 2;
}

function clearSelection() {
  selectedCubes.clear();
  updateSelectionVisuals();
  updateBatchPanel();
}

function batchDelete() {
  const count = selectedCubes.size;
  if (count === 0) return;
  if (confirm(`Delete ${count} selected cube(s)? This cannot be undone.`)) {
    const toDelete = [...selectedCubes].map(id => nodes.find(n => n.id === id)).filter(Boolean);
    toDelete.forEach(node => deleteCube(node));
    clearSelection();
    toast(`${toDelete.length} CUBES DELETED`);
  }
}

function batchMerge() {
    const count = selectedCubes.size;
    if (count < 2) return;
    if (confirm(`Merge ${count} cubes into one? The original cubes will be deleted.`)) {
        const selectedNodes = [...selectedCubes].map(id => nodes.find(n => n.id === id)).filter(Boolean);
        const newNode = makeNode('MERGED NODE');
        nodes.push(newNode);
        const el = createCubeEl(newNode);
        el.classList.add('appearing');
        setTimeout(() => el.classList.remove('appearing'), 800);
        const allEntries = selectedNodes.flatMap(n => n.entries);
        for (const lens of LENS_ORDER) { const entryForLens = allEntries.find(e => e.lens === lens); if (entryForLens) commitToLens(entryForLens.text, newNode, lens); }
        selectedNodes.forEach(node => deleteCube(node));
        clearSelection(); toast(`${count} CUBES MERGED`); jumpToCube(newNode);
    }
}

// ═══════════════════════════════════════════════════
// 3D ORBIT + ZOOM
// ═══════════════════════════════════════════════════
let az=25,el=-18,zoom=1.0;
const LOD_ZOOM_CLUSTER = 0.0;
const LOD_ZOOM_CUBE = 1.2;
const ZOOM_MIN=0.25,ZOOM_MAX=3.0;
let drag=null,pinchStartDist=null,pinchStartZoom=null;
const stage=document.getElementById('stage');
const world=document.getElementById('world');

function applyOrbit(){ stage.style.transform=`scale(${zoom}) rotateX(${el}deg) rotateY(${az}deg)`; }
function pt(e){return e.touches?e.touches[0]:e;}

world.addEventListener('mousedown',e=>startDrag(e));
world.addEventListener('touchstart',e=>startDrag(e),{passive:false});
window.addEventListener('mousemove',e=>moveDrag(e));
window.addEventListener('touchmove',e=>moveDrag(e),{passive:false});
window.addEventListener('mouseup',()=>{drag=null;});
window.addEventListener('touchend',e=>{if(e.touches.length<2)pinchStartDist=null;if(e.touches.length===0)drag=null;});
world.addEventListener('wheel',e=>{
  if(e.target.closest('#lens-modal,#overlay,#input-bar,#import-modal'))return;
  e.preventDefault();
  zoom=Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,zoom*(e.deltaY>0?0.92:1.08)));
  applyOrbit();
},{passive:false});
function startDrag(e){
  if(e.target.closest('#lens-modal,#overlay,#input-bar,#import-modal'))return;
  e.preventDefault();
  if(e.touches&&e.touches.length===2){pinchStartDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);pinchStartZoom=zoom;drag=null;return;}
  const p=pt(e); drag={x:p.clientX,y:p.clientY,az,el};
  document.getElementById('orbit-hint').style.opacity='0';
}
function moveDrag(e){
  if(e.touches&&e.touches.length===2&&pinchStartDist!==null){e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoom=Math.min(ZOOM_MAX,Math.max(ZOOM_MIN,pinchStartZoom*(d/pinchStartDist)));applyOrbit();return;}
  if(!drag)return;e.preventDefault();const p=pt(e);
  az=drag.az+(p.clientX-drag.x)*0.45;
  el=Math.max(-80,Math.min(80,drag.el-(p.clientY-drag.y)*0.35));
  applyOrbit();
}
applyOrbit();

// ═══════════════════════════════════════════════════
// CLUSTER ENGINE
// ═══════════════════════════════════════════════════
const CLUSTER_THRESHOLD = 0.3;
const CLUSTER_MIN_SIZE = 3;
let activeClusters = [];

function mergeMemories(clusterNodes) {
  const merged = new Map();
  for(const n of clusterNodes) {
    for(const [k,v] of n.memory) merged.set(k, (merged.get(k)||0)+v);
  }
  return merged;
}

function detectClusters() {
  const adj = new Map();
  nodes.forEach(n => adj.set(n.id, []));

  // Build Graph
  for(let i=0; i<nodes.length; i++){
    for(let j=i+1; j<nodes.length; j++){
      const sim = computeAttraction(nodes[i], nodes[j]);
      if(sim >= CLUSTER_THRESHOLD){
        adj.get(nodes[i].id).push(nodes[j].id);
        adj.get(nodes[j].id).push(nodes[i].id);
      }
    }
  }

  // Find Components
  const visited = new Set();
  const components = [];
  for(const node of nodes){
    if(visited.has(node.id)) continue;
    const comp = [];
    const queue = [node.id];
    visited.add(node.id);
    while(queue.length){
      const currId = queue.shift();
      comp.push(currId);
      const neighbors = adj.get(currId) || [];
      for(const nid of neighbors){
        if(!visited.has(nid)){
          visited.add(nid);
          queue.push(nid);
        }
      }
    }
    if(comp.length >= CLUSTER_MIN_SIZE) components.push(comp);
  }

  // Render Units
  document.querySelectorAll('.cluster-label').forEach(el => el.remove());
  document.querySelectorAll('.cluster-meta-cube').forEach(el => el.remove());
  activeClusters = [];

  components.forEach(ids => {
    const clusterNodes = ids.map(id => nodes.find(n => n.id === id));
    const merged = mergeMemories(clusterNodes);
    const mainTopic = deriveTopicLabel(merged, 'CLUSTER').replace('NEW NODE','UNNAMED CLUSTER');
    
    const el = document.createElement('div');
    el.className = 'cluster-label';
    el.innerHTML = `<span style="opacity:0.6">CLUSTER //</span> ${mainTopic}`;
    stage.appendChild(el);
    
    const clusterObj = { ids, el };
    createMetaCube(clusterObj);
    activeClusters.push(clusterObj);
  });
  checkFission();
}

function createMetaCube(cluster) {
  const size = 60 + Math.min(cluster.ids.length * 8, 80);
  cluster.metaSize = size;

  const el = document.createElement('div');
  el.className = 'cluster-meta-cube';
  
  // Position will be set in updateClusterVisuals, but init here
  el.style.cssText = `width:${size}px; height:${size}px; opacity:0; transition:opacity 0.4s;`;

  // Add glowing faces
  const colors = ['#00d4ff','#ff4e4e','#a855f7','#f59e0b','#10b981','#6b7a99'];
  const transforms = ['translateZ('+size/2+'px)', 'rotateY(180deg) translateZ('+size/2+'px)', 'rotateY(-90deg) translateZ('+size/2+'px)', 'rotateY(90deg) translateZ('+size/2+'px)', 'rotateX(90deg) translateZ('+size/2+'px)', 'rotateX(-90deg) translateZ('+size/2+'px)'];
  
  colors.forEach((col, i) => {
    const face = document.createElement('div');
    face.style.cssText = `
      position:absolute; width:100%; height:100%;
      background:${col}; opacity:0.1;
      transform: ${transforms[i]};
      border:1px solid ${col}; box-shadow:0 0 40px ${col};
      backface-visibility:visible;
    `;
    el.appendChild(face);
  });
  
  stage.appendChild(el);
  cluster.metaEl = el;
  return el;
}

const FISSION_THRESHOLD = 0.6; // 1.0 = distinct, 0.0 = identical
const FISSION_MIN_SIZE = 6;

function getCentroid(nodes) {
  const cent = new Map();
  for(const n of nodes) for(const [k,v] of n.memory) cent.set(k, (cent.get(k)||0) + v);
  return cent;
}

function cosineSim(vecA, vecB) {
  let dot=0, magA=0, magB=0;
  for(const v of vecA.values()) magA+=v*v;
  for(const v of vecB.values()) magB+=v*v;
  if(!magA || !magB) return 0;
  for(const [k,vA] of vecA) if(vecB.has(k)) dot += vA * vecB.get(k);
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function computeKeywordVariance(nodes) {
  if(nodes.length<2) return 0;
  const c = getCentroid(nodes);
  let sum = 0;
  for(const n of nodes) sum += (1 - cosineSim(n.memory, c));
  return sum / nodes.length;
}

function kMeansSplit(nodes) {
  let c1 = nodes[0].memory, c2 = nodes[nodes.length-1].memory;
  if(nodes.length>2) { c1=nodes[Math.floor(Math.random()*nodes.length)].memory; do{c2=nodes[Math.floor(Math.random()*nodes.length)].memory}while(c1===c2); }
  let gA=[], gB=[];
  for(let i=0;i<4;i++){
    gA=[]; gB=[];
    for(const n of nodes) {
      if((1-cosineSim(n.memory,c1)) < (1-cosineSim(n.memory,c2))) gA.push(n); else gB.push(n);
    }
    if(!gA.length||!gB.length) break;
    c1=getCentroid(gA); c2=getCentroid(gB);
  }
  if(!gA.length||!gB.length){ const h=Math.floor(nodes.length/2); gA=nodes.slice(0,h); gB=nodes.slice(h); }
  return [gA, gB];
}

function checkFission() {
  for(const c of activeClusters) {
    const cNodes = c.ids.map(id => nodes.find(n => n.id === id)).filter(n=>n);
    if(cNodes.length < FISSION_MIN_SIZE) continue;
    
    const v = computeKeywordVariance(cNodes);
    if(v > FISSION_THRESHOLD || cNodes.length > 12) {
      const [subA, subB] = kMeansSplit(cNodes);
      
      // Animate
      cNodes.forEach(n => { if(n.el) n.el.classList.add('splitting'); });
      c.el.style.opacity = '0';
      
      setTimeout(() => {
        c.el.remove();
        const kick = { x:(Math.random()-0.5), y:(Math.random()-0.5), z:(Math.random()-0.5) };
        const mag = Math.hypot(kick.x,kick.y,kick.z)||1;
        const apply = (g, dir) => g.forEach(n => {
          if(n.el) { n.el.classList.remove('splitting'); n.el.classList.add('appearing'); setTimeout(()=>n.el?.classList.remove('appearing'),800); }
          n.velocity.x += (kick.x/mag) * dir * 2.5; n.velocity.y += (kick.y/mag) * dir * 2.5; n.velocity.z += (kick.z/mag) * dir * 2.5;
        });
        apply(subA, 1); apply(subB, -1);
        toast('CLUSTER FISSION DETECTED — REORGANISING');
        activeClusters = activeClusters.filter(x => x !== c);
      }, 600);
    }
  }
}

function updateClusterVisuals() {
  for(const c of activeClusters) {
    let sx=0, sy=0, sz=0, count=0;
    for(const id of c.ids) {
      const n = nodes.find(x => x.id === id);
      if(n) { sx+=n.position.x; sy+=n.position.y; sz+=n.position.z; count++; }
    }
    if(count > 0) {
      const cx = sx/count, cy = sy/count, cz = sz/count;
      c.el.style.transform = `translate3d(${cx}px, ${cy}px, ${cz}px) translate(-50%, -50%)`;
      if(c.metaEl) c.metaEl.style.transform = `translate3d(${cx - c.metaSize/2}px, ${cy - c.metaSize/2}px, ${cz}px)`;
    }
  }
}

function updateLOD() {
  if(timelineActive) return;
  const isClusterView = zoom < LOD_ZOOM_CLUSTER;

  // Cluster Labels
  activeClusters.forEach(c => {
    if(c.el) c.el.style.display = isClusterView ? 'block' : 'none';
    if(c.metaEl) c.metaEl.style.opacity = isClusterView ? '1' : '0';
  });

  if(isClusterView) {
    activeClusters.forEach(c => {
      c.ids.forEach(id => {
        const n = nodes.find(x => x.id === id);
        if(n && n.el) n.el.style.display = 'none';
      });
    });
  } else {
    nodes.forEach(n => { if(n.el) n.el.style.display = ''; });
  }
}

// GRAVITY & ATTRACTION
// ═══════════════════════════════════════════════════
const edgePool = [];
const EDGE_THRESHOLD = 0.15;
function getEdgeEl(i) {
  if(edgePool[i]) return edgePool[i];
  const edgeEl = document.createElement('div');
  edgeEl.className = 'edge-line';
  stage.insertBefore(edgeEl, stage.firstChild);
  edgePool.push(edgeEl);
  return edgeEl;
}

function drawEdges() {
  let edgeIdx = 0;
  for(let i=0; i<nodes.length; i++){
    for(let j=i+1; j<nodes.length; j++){
      const A = nodes[i];
      const B = nodes[j];
      const sim = computeAttraction(A, B);
      if(sim > EDGE_THRESHOLD) {
        const el = getEdgeEl(edgeIdx++);
        const dx = B.position.x - A.position.x;
        const dy = B.position.y - A.position.y;
        const dz = B.position.z - A.position.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        
        const ry = Math.atan2(dz, dx);
        const rz = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz));
        
        el.style.width = `${dist}px`;
        el.style.transform = `translate3d(${A.position.x}px, ${A.position.y}px, ${A.position.z}px) rotateY(${ry}rad) rotateZ(${rz}rad)`;
        
        let opacity = Math.max(0, (sim - 0.1) * 3 - (dist/800));
        if (focusedNode) {
          const isFocusedEdge = (A.id === focusedNode.id || B.id === focusedNode.id);
          if (!isFocusedEdge) opacity *= 0.1; // Dim unfocused edges
        }
        el.style.opacity = opacity;

        el.style.display = '';

        el.style.transition = 'box-shadow 0.5s';
        el.style.boxShadow = `0 0 ${5 + Math.sin(Date.now() * 0.003) * 3}px var(--holo)`;
        el.setAttribute('data-strength', sim.toFixed(2));
        el.title = `${Math.round(sim*100)}% similarity`;
        el.onclick = (e) => {
          e.stopPropagation();
          toast(`CONNECTION STRENGTH: ${Math.round(sim*100)}% · ${A.topic} ↔ ${B.topic}`);
        };
      }
    }
  }
  for(let k=edgeIdx; k<edgePool.length; k++) edgePool[k].style.display = 'none';
}

function getSimCacheKey(idA, idB) {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
}

function invalidateNodeCache(nodeId) {
  const nodeIdStr = String(nodeId);
  const keysToDelete = [];
  for (const key of similarityCache.keys()) {
    const ids = key.split('-');
    if (ids[0] === nodeIdStr || ids[1] === nodeIdStr) {
      keysToDelete.push(key);
    }
  }
  for (const key of keysToDelete) {
    similarityCache.delete(key);
  }
}

function computeAttraction(nodeA, nodeB) {
  const cacheKey = getSimCacheKey(nodeA.id, nodeB.id);
  if (similarityCache.has(cacheKey)) return similarityCache.get(cacheKey);
  // Get top 10 keywords from each
  const vecA = [...nodeA.memory.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0,10)
    .map(([k]) => k);

  const vecB = [...nodeB.memory.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0,10)
    .map(([k]) => k);

  // Jaccard similarity
  const intersection = vecA.filter(k => vecB.includes(k)).length;
  const union = new Set([...vecA, ...vecB]).size;

  const sim = union === 0 ? 0 : intersection / union; // 0 to 1
  similarityCache.set(cacheKey, sim);
  return sim;
}

let animFrame;
const REPULSION = 280000;
const CENTER_GRAVITY = 0.0008;
const ATTRACTION = 0.03;
const MAX_VEL = 2.0;

function tickGravity() {
  for(let i=0;i<nodes.length;i++){
    const A=nodes[i];
    if(!A.velocity) A.velocity={x:0,y:0,z:0};
    
    // Center pull
    A.velocity.x -= A.position.x * CENTER_GRAVITY;
    A.velocity.y -= A.position.y * CENTER_GRAVITY;
    A.velocity.z -= A.position.z * CENTER_GRAVITY;

    for(let j=0;j<nodes.length;j++){
      if(i===j) continue;
      const B=nodes[j];
      const dx = A.position.x - B.position.x;
      const dy = A.position.y - B.position.y;
      const dz = A.position.z - B.position.z;
      let distSq = dx*dx + dy*dy + dz*dz;
      if(distSq<100) distSq=100;
      const dist = Math.sqrt(distSq);

      // Repulsion
      const fRep = REPULSION / (distSq * dist); 
      A.velocity.x += dx * fRep;
      A.velocity.y += dy * fRep;
      A.velocity.z += dz * fRep;

      // Attraction
      const sim = computeAttraction(A, B);
      if(sim > 0) {
        const fAtt = sim * ATTRACTION;
        A.velocity.x -= dx * fAtt;
        A.velocity.y -= dy * fAtt;
        A.velocity.z -= dz * fAtt;
      }
    }
  }

  // Update
  for(const n of nodes){
    // Damping
    n.velocity.x *= 0.94;
    n.velocity.y *= 0.94;
    n.velocity.z *= 0.94;
    
    // Cap
    const vSq = n.velocity.x**2 + n.velocity.y**2 + n.velocity.z**2;
    if(vSq > MAX_VEL*MAX_VEL){
      const sc = MAX_VEL / Math.sqrt(vSq);
      n.velocity.x*=sc; n.velocity.y*=sc; n.velocity.z*=sc;
    }

    n.position.x += n.velocity.x;
    n.position.y += n.velocity.y;
    n.position.z += n.velocity.z;

    if(n.el) {
      let transform = `translate3d(${n.position.x-75}px,${n.position.y-75}px,${n.position.z}px)`;
      if(n.locked) transform += ` rotateY(${-az}deg) rotateX(${-el}deg)`;
      n.el.style.transform = transform;
    }
  }
  updateClusterVisuals();
  drawEdges();
  updateLOD();
  animFrame = requestAnimationFrame(tickGravity);
}

function repositionAll(){
  // No-op: gravity loop handles layout now
}

// ═══════════════════════════════════════════════════
// RENDER CUBE
// ═══════════════════════════════════════════════════
function createCubeEl(node){
  const wrap=document.createElement('div');
  wrap.className='cube-entity'; wrap.dataset.nodeId=node.id;
  const body=document.createElement('div');
  body.className='cube-body';

  LENS_ORDER.forEach(lensKey=>{
    const L=LENSES[lensKey];
    const face=document.createElement('div');
    face.className=`face face-${L.face}`; face.dataset.lens=lensKey;

    ['tl','tr','bl','br'].forEach(p=>{const fc=document.createElement('div');fc.className=`fc ${p}`;face.appendChild(fc);});

    const iconEl=document.createElement('div'); iconEl.className='face-lens-icon'; iconEl.textContent=L.icon;
    const labelEl=document.createElement('div'); labelEl.className='face-label'; labelEl.textContent=L.name;
    const textEl=document.createElement('div');  textEl.className='face-text';
    const hintEl=document.createElement('div');  hintEl.className='face-empty-hint'; hintEl.textContent=L.hint;

    face.appendChild(iconEl); face.appendChild(labelEl); face.appendChild(textEl); face.appendChild(hintEl);
    body.appendChild(face);

    face.addEventListener('click', e => {
      e.stopPropagation();
      toggleSelect(node, e.shiftKey);
    });
    face.addEventListener('dblclick',e=>{
      e.stopPropagation();
      const entry=getLensEntry(node,lensKey);
      if(entry) openExpand(entry,node,lensKey);
      else openLensPicker(null,node,[lensKey]); // tap empty face → add to that lens
    });
  });

  const topicEl=document.createElement('div'); topicEl.className='cube-topic'; topicEl.textContent=node.topic;

  // pip row
  const pipsEl=document.createElement('div'); pipsEl.className='cube-pips';
  LENS_ORDER.forEach(k=>{
    const pip=document.createElement('div'); pip.className='cube-pip'; pip.dataset.lensKey=k;
    pip.style.setProperty('--pip-c',LENSES[k].color);
    pipsEl.appendChild(pip);
  });

  const notesIndicator = document.createElement('div');
  notesIndicator.className = 'cube-notes-indicator';
  notesIndicator.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M1 1h10v7H6L3 11V8H1V1z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  notesIndicator.title = 'This cube has private notes';

  const shadow=document.createElement('div'); shadow.className='cube-shadow';
  wrap.appendChild(body); wrap.appendChild(topicEl); wrap.appendChild(pipsEl); wrap.appendChild(notesIndicator); wrap.appendChild(shadow);
  stage.appendChild(wrap);
  node.el=wrap;
  updateCubeEl(node);
  return wrap;
}

function _updateFace(faceEl, pipEl, entry) {
    const textEl = faceEl.querySelector('.face-text');
    const hintEl = faceEl.querySelector('.face-empty-hint');
    if (entry) {
        faceEl.classList.add('has-data');
        textEl.textContent = entry.text;
        if (hintEl) hintEl.style.display = 'none';
        if (pipEl) pipEl.classList.add('filled');
    } else {
        faceEl.classList.remove('has-data');
        textEl.textContent = '';
        if (hintEl) hintEl.style.display = '';
        if (pipEl) pipEl.classList.remove('filled');
    }
}

function updateCubeEl(node){
  if(!node.el)return;
  const topicEl=node.el.querySelector('.cube-topic');
  if(topicEl) topicEl.textContent=node.topic;
  LENS_ORDER.forEach(lensKey=>{
    const L=LENSES[lensKey];
    const faceEl=node.el.querySelector(`.face-${L.face}`);
    const pipEl=node.el.querySelector(`.cube-pip[data-lens-key="${lensKey}"]`);
    if(!faceEl) return;
    const entry=getLensEntry(node,lensKey);
    _updateFace(faceEl, pipEl, entry);
  });
  const notesIndicator = node.el.querySelector('.cube-notes-indicator');
  if (notesIndicator) {
    notesIndicator.classList.toggle('has-notes', node.notes && node.notes.length > 0);
  }
}

// ═══════════════════════════════════════════════════
// LENS PICKER MODAL
// ═══════════════════════════════════════════════════
let _lensResolve=null;

function openLensPicker(text, targetNode, forceLenses=null){
  return new Promise(resolve=>{
    _lensResolve=resolve;
    const modal=document.getElementById('lens-modal');

    if(text){
      document.getElementById('lens-sub').textContent='Choose which perspective lens to store this on. The classifier has suggested options based on language cues.';
      document.getElementById('lens-entry-preview').textContent=text;
    } else {
      document.getElementById('lens-sub').textContent='This face is empty. Add a perspective entry to it:';
      document.getElementById('lens-entry-preview').style.display='none';
    }

    if(targetNode){
      document.getElementById('lens-target-info').textContent=`TARGET CUBE: ${targetNode.topic.toUpperCase()}`;
    } else {
      document.getElementById('lens-target-info').textContent='';
    }

    const grid=document.getElementById('lens-grid');
    grid.innerHTML='';

    const allowedLenses = forceLenses || LENS_ORDER;
    const suggested = text ? suggestLens(text) : null;

    allowedLenses.forEach(lensKey=>{
      const L=LENSES[lensKey];
      const alreadyFilled = targetNode && getLensEntry(targetNode,lensKey);
      const btn=document.createElement('button');
      btn.className=`lens-btn${alreadyFilled?' disabled':''}`;
      btn.dataset.lens=lensKey;
      btn.style.setProperty('--lc',L.color);
      const suggestBadge = (lensKey===suggested&&!alreadyFilled) ? ' ◀ SUGGESTED' : '';
      btn.innerHTML=`<span class="lens-btn-icon">${L.icon}</span><span class="lens-btn-name">${L.name}${suggestBadge}</span><span class="lens-btn-desc">${L.desc}</span>${alreadyFilled?`<span class="lens-btn-filled">⬤ ALREADY FILLED</span>`:''}`;
      if(!alreadyFilled){
        btn.addEventListener('click',()=>{
          closeLensPicker();
          if(text===null){
            // prompt for text then resolve
            promptTextForLens(lensKey,targetNode,resolve);
          } else {
            resolve({action:'place',lensKey,targetNodeId:targetNode?.id});
          }
        });
      }
      grid.appendChild(btn);
    });

    // new node option (only if text is provided and it's not a forced-face tap)
    const newBtn=document.getElementById('lens-new-btn');
    if(text&&!forceLenses){
      newBtn.style.display='';
      newBtn.onclick=()=>{ closeLensPicker(); resolve({action:'new'}); };
    } else {
      newBtn.style.display='none';
    }

    document.getElementById('lens-cancel-btn').onclick=()=>{ closeLensPicker(); resolve({action:'cancel'}); };

    modal.style.display='flex';
    requestAnimationFrame(()=>modal.classList.add('open'));
  });
}

function promptTextForLens(lensKey, targetNode, resolve){
  const L=LENSES[lensKey];
  const text=window.prompt(`Enter ${L.name} for "${targetNode.topic}":\n\n${L.hint}`);
  if(text&&text.trim()){
    commitToLens(text.trim(),targetNode,lensKey);
    resolve({action:'done'});
  } else {
    resolve({action:'cancel'});
  }
}

function closeLensPicker(){
  const modal=document.getElementById('lens-modal');
  modal.classList.remove('open');
  setTimeout(()=>{ modal.style.display='none'; document.getElementById('lens-entry-preview').style.display=''; },300);
}

// ═══════════════════════════════════════════════════
// CORE: place text on a specific lens of a node
// ═══════════════════════════════════════════════════
function commitToLens(text, node, lensKey){
  if(getLensEntry(node,lensKey)) return; // already filled
  const tokens=tokenise(text);
  node.entries.push({lens:lensKey,text,addedAt:Date.now()});
  totalEntries++;
  feedMemory(node.memory,tokens);
  if(lensKey==='fact') node.topic=deriveTopicLabel(node.memory,node.topic);
  invalidateNodeCache(node.id);
  updateCubeEl(node);

  const L=LENSES[lensKey];
  const faceEl=node.el?.querySelector(`.face-${L.face}`);
  if(faceEl){ faceEl.style.animation='faceFlash 0.8s ease forwards'; setTimeout(()=>{faceEl.style.animation='';},800); }

  // Flash world briefly for full cube
  if(node.entries.length>=6){
    world.style.transition='filter 0.1s'; world.style.filter='brightness(1.4)';
    setTimeout(()=>{world.style.filter='';},150);
    toast(`CUBE COMPLETE — ALL 6 LENSES FILLED`);
  }

  updateMeta(); saveState();
  if(nodes.length>2) detectClusters();
  return lensKey;
}

// ═══════════════════════════════════════════════════
// ADD ENTRY FLOW
// ═══════════════════════════════════════════════════
const AUTO_ROUTE=0.42;
const ASK_THRESHOLD=0.12;

async function addEntry(text){
  if(!text.trim()) return;
  const tokens=tokenise(text);
  const {candidates}=classifyToNode(text,nodes);
  const best=candidates[0];

  // Step 1: determine target node
  let targetNode=null;

  if(!best||best.score<ASK_THRESHOLD){
    // No match — this becomes a new cube seeded with FACT
    const newTokens = tokenise(text);
    const tempMem = new Map();
    feedMemory(tempMem, newTokens);
    targetNode = makeNode(deriveTopicLabel(tempMem, '') || 'NEW NODE');
    nodes.push(targetNode);
    const el=createCubeEl(targetNode);
    el.classList.add('appearing'); setTimeout(()=>el.classList.remove('appearing'),800);
    repositionAll();
    commitToLens(text,targetNode,'fact');
    targetNode.position.x+=(Math.random()-0.5)*20; // jitter
    toast(`NEW CUBE — ${targetNode.topic.toUpperCase()}`);
    return;
  }

  if(best.score>=AUTO_ROUTE){
    targetNode=nodes.find(n=>n.id===best.nodeId);
    toast(`MATCHED → ${targetNode.topic.toUpperCase()} (${Math.round(best.score*100)}%)`);
  } else {
    // Ambiguous: ask which node (re-use lens modal heading)
    // For simplicity we use the best match but ask which lens
    targetNode=nodes.find(n=>n.id===best.nodeId);
  }

  // Step 2: determine which lens
  const freeLenses=getFreeLenses(targetNode);
  if(!freeLenses.length){ toast('ALL LENSES FULL — SPAWNING NEW CUBE'); addEntryAsNew(text); return; }

  const suggested=suggestLens(text);
  let chosenLens=null;

  // If the suggested lens is free AND score is confident → auto place
  if(suggested&&freeLenses.includes(suggested)&&best.score>=AUTO_ROUTE){
    chosenLens=suggested;
    commitToLens(text,targetNode,chosenLens);
    toast(`AUTO → ${targetNode.topic} · ${LENSES[chosenLens].name.toUpperCase()}`);
  } else {
    // Ask user to pick lens
    const result=await openLensPicker(text,targetNode,freeLenses);
    if(result.action==='place'){
      commitToLens(text,targetNode,result.lensKey);
      toast(`STORED → ${targetNode.topic} · ${LENSES[result.lensKey].name.toUpperCase()}`);
    } else if(result.action==='new'){
      addEntryAsNew(text);
    }
  }
}

function addEntryAsNew(text){
  const tokens=tokenise(text);
  const tempMem = new Map();
  feedMemory(tempMem, tokens);
  const node=makeNode(deriveTopicLabel(tempMem,'')||'NEW NODE');
  nodes.push(node);
  const el=createCubeEl(node);
  el.classList.add('appearing'); setTimeout(()=>el.classList.remove('appearing'),800);
  repositionAll();
  commitToLens(text,node,'fact');
  node.position.x+=(Math.random()-0.5)*20; // jitter
  toast(`NEW CUBE — ${node.topic.toUpperCase()}`);
}

// ═══════════════════════════════════════════════════
// EXPAND OVERLAY
// ═══════════════════════════════════════════════════
function openExpand(entry, node, lensKey){
  document.getElementById('world').classList.add('focus-active');
  if (focusedNode && focusedNode.el) focusedNode.el.classList.remove('focused');
  focusedNode = node;
  if (node.el) node.el.classList.add('focused');

  const L=LENSES[lensKey];
  const card=document.getElementById('expand-card');
  card.style.setProperty('--expand-lc',L.color);
  document.getElementById('expand-lens-icon').textContent=L.icon;
  document.getElementById('expand-lens-name').textContent=' '+L.name;
  document.getElementById('expand-topic').textContent=`CUBE: ${node.topic.toUpperCase()}`;
  document.getElementById('expand-text').textContent=entry.text;
  document.getElementById('expand-meta').textContent=`RECORDED ${new Date(entry.addedAt).toLocaleString().toUpperCase()}`;

  const lockBtn = document.getElementById('expand-lock');
  lockBtn.textContent = node.locked ? 'UNLOCK ROTATION' : 'LOCK ROTATION';
  lockBtn.onclick = () => {
    node.locked = !node.locked;
    lockBtn.textContent = node.locked ? 'UNLOCK ROTATION' : 'LOCK ROTATION';
    saveState();
    toast(node.locked ? 'CUBE ROTATION LOCKED' : 'CUBE ROTATION UNLOCKED');
  };

  document.getElementById('expand-delete').onclick = () => {
    if(confirm(`Permanently delete cube "${node.topic}"?`)){
      deleteCube(node);
      closeExpand();
    }
  };

  renderNotes(node);
  const noteInput = document.getElementById('expand-note-input');
  const addNoteBtn = document.getElementById('expand-note-add-btn');
  const addNoteAction = () => { const noteText = noteInput.value.trim(); if (noteText) { addNoteToCube(node, noteText); noteInput.value = ''; renderNotes(node); noteInput.focus(); } };
  addNoteBtn.onclick = addNoteAction;
  noteInput.onkeydown = (e) => { if(e.key === 'Enter') { e.preventDefault(); addNoteAction(); } };

  const ov=document.getElementById('overlay');
  ov.style.display='flex'; requestAnimationFrame(()=>ov.classList.add('open'));
}
function closeExpand(){
  document.getElementById('world').classList.remove('focus-active');
  if (focusedNode && focusedNode.el) focusedNode.el.classList.remove('focused');
  focusedNode = null;

  const ov=document.getElementById('overlay');
  ov.classList.remove('open');
  setTimeout(()=>{ov.style.display='none';},300);
}

function addNoteToCube(node, noteText) {
  if(!node.notes) node.notes = [];
  node.notes.push({text: noteText, addedAt: Date.now()});
  updateCubeEl(node);
  saveState();
}

function renderNotes(node) {
  const listEl = document.getElementById('expand-notes-list');
  listEl.innerHTML = '';
  if (!node.notes || node.notes.length === 0) {
    listEl.innerHTML = '<div class="expand-note-item" style="opacity:0.3;font-style:italic;">No private notes for this cube.</div>';
    return;
  }
  node.notes.slice().reverse().forEach(note => { // show newest first
    const item = document.createElement('div');
    item.className = 'expand-note-item';
    const dateStr = new Date(note.addedAt).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).toUpperCase();
    item.innerHTML = `${escHtml(note.text)}<div class="expand-note-meta">${dateStr}</div>`;
    listEl.appendChild(item);
  });
}

function deleteCube(node){
  if(node.el) node.el.remove();
  if (focusedNode && focusedNode.id === node.id) closeExpand();

  nodes = nodes.filter(n => n.id !== node.id);
  totalEntries -= node.entries.length;
  invalidateNodeCache(node.id);
  updateMeta();
  detectClusters();
  saveState();
  toast('CUBE DELETED');
}

document.getElementById('expand-close').addEventListener('click',closeExpand);
document.getElementById('overlay').addEventListener('click',e=>{if(e.target===document.getElementById('overlay'))closeExpand();});

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════
let toastTimer;
function toast(msg, duration = 2800){ const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),duration); }
function updateMeta(){ document.getElementById('header-meta').textContent=`${nodes.length} node${nodes.length!==1?'s':''} · ${totalEntries} entr${totalEntries!==1?'ies':'y'}`; }

// ═══════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════
const input=document.getElementById('data-input');
const btn=document.getElementById('add-btn');
btn.addEventListener('click',()=>{ const v=input.value.trim(); if(!v)return; input.value=''; addEntry(v); });
input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const v=input.value.trim(); if(!v)return; input.value=''; addEntry(v); } });

// ═══════════════════════════════════════════════════
// IMPORT
// ═══════════════════════════════════════════════════
function openImport(){ const m=document.getElementById('import-modal'); m.style.display='flex'; requestAnimationFrame(()=>m.classList.add('open')); }
function closeImport(){ const m=document.getElementById('import-modal'); m.classList.remove('open'); setTimeout(()=>{m.style.display='none';document.getElementById('import-paste').value='';document.getElementById('import-file').value='';document.getElementById('import-confirm').disabled=true;},300); }
document.getElementById('import-btn').addEventListener('click',openImport);
document.getElementById('import-close').addEventListener('click',closeImport);
document.getElementById('import-cancel').addEventListener('click',closeImport);
document.getElementById('import-modal').addEventListener('click',e=>{if(e.target===document.getElementById('import-modal'))closeImport();});
document.getElementById('import-paste').addEventListener('input',()=>{document.getElementById('import-confirm').disabled=!document.getElementById('import-paste').value.trim();});
const dropZone=document.getElementById('import-drop');
dropZone.addEventListener('dragover',e=>{e.preventDefault();dropZone.classList.add('dragover');});
dropZone.addEventListener('dragleave',()=>dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop',e=>{e.preventDefault();dropZone.classList.remove('dragover');const f=e.dataTransfer.files[0];if(f)readFile(f);});
document.getElementById('import-file').addEventListener('change',e=>{const f=e.target.files[0];if(f)readFile(f);});
function readFile(file){ const reader=new FileReader(); reader.onload=ev=>{ let text=ev.target.result; if(file.name.endsWith('.json')){ try{const p=JSON.parse(text);text=Array.isArray(p)?p.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n'):Object.values(p).map(x=>String(x)).join('\n');}catch(e){} } document.getElementById('import-paste').value=text; document.getElementById('import-confirm').disabled=!text.trim(); }; reader.readAsText(file); }
document.getElementById('import-confirm').addEventListener('click',async()=>{
  const raw=document.getElementById('import-paste').value;
  const lines=raw.split('\n').map(l=>l.replace(/^[-*•]\s*/,'').trim()).filter(l=>l.length>2);
  if(!lines.length)return;

  // Clear selection when importing to avoid confusion
  if (selectedCubes.size > 0) {
    clearSelection();
  }
  if (focusedNode) {
    closeExpand();
  }

  closeImport();
  toast(`TRANSMITTING ${lines.length} FACTS…`);
  for(let i=0;i<lines.length;i++){
    // Import always seeds as FACT
    const tokens=tokenise(lines[i]);
    const tempMem = new Map();
    feedMemory(tempMem, tokens);
    const node=makeNode(deriveTopicLabel(tempMem,'')||'DATA');
    nodes.push(node);
    const el=createCubeEl(node);
    el.classList.add('appearing'); setTimeout(()=>el.classList.remove('appearing'),800);
    repositionAll();
    commitToLens(lines[i],node,'fact');
    if(i<lines.length-1) await new Promise(r=>setTimeout(r,80));
  }
  toast(`${lines.length} CUBES SEEDED — ADD PERSPECTIVES VIA FACES`);
});

// ═══════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════
function scoreCube(n) { return n.entries.length / 6; }

function exportGraph() {
  const data = nodes.map(n => ({
    topic: n.topic,
    entries: n.entries,
    score: scoreCube(n),
    keywords: [...n.memory.keys()].slice(0, 20)
  }));
  downloadJSON(data, `datacube-graph-${new Date().toISOString().slice(0,10)}.json`);
  toast('GRAPH EXPORTED TO JSON');
}

function batchExport() {
  const count = selectedCubes.size;
  if (count === 0) return;
  const selectedNodes = [...selectedCubes].map(id => nodes.find(n => n.id === id)).filter(Boolean);
  const data = selectedNodes.map(n => ({ topic: n.topic, entries: n.entries, score: scoreCube(n), keywords: [...n.memory.keys()].slice(0, 20) }));
  downloadJSON(data, `datacube-selection-${new Date().toISOString().slice(0,10)}.json`);
  toast(`${selectedNodes.length} CUBES EXPORTED`);
}

function downloadJSON(data, filename) {
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
document.getElementById('export-btn').addEventListener('click', exportGraph);

// ═══════════════════════════════════════════════════
// PHASE 19: EXPORT AS INTERACTIVE HTML
// ═══════════════════════════════════════════════════
function exportStandalone() {
  const data = {
    nextId,
    totalEntries,
    nodes: nodes.map(n => ({
      id: n.id,
      topic: n.topic,
      entries: n.entries,
      memory: [...n.memory.entries()],
      position: n.position,
      velocity: n.velocity,
      notes: n.notes || [],
      locked: n.locked
    }))
  };
  
  const json = JSON.stringify(data).replace(/<\/script/g, '<\\/script');
  let html = document.documentElement.outerHTML;
  
  // Replace boot logic with embedded data loader
  const replacement = `
    const embeddedData = ${json}; 
    function loadEmbedded() {
      try {
        const data = embeddedData;
        nextId = data.nextId || 0;
        totalEntries = data.totalEntries || 0;
        for(const nd of data.nodes){
          const node={id:nd.id,topic:nd.topic,entries:nd.entries,memory:new Map(nd.memory),el:null,position:nd.position||{x:0,y:0,z:0},velocity:nd.velocity||{x:0,y:0,z:0}, notes: nd.notes || [], locked: nd.locked || false};
          nodes.push(node);
          const el=createCubeEl(node);
          el.style.transform=\`translate3d(\${node.position.x-75}px,\${node.position.y-75}px,\${node.position.z}px)\`;
        }
        updateMeta();
        return true;
      } catch(e){ console.error(e); return false; }
    }
    const restored=loadEmbedded();`;

  html = html.replace('const restored=loadState();', replacement);
  
  const blob = new Blob([html], {type: 'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `datacube-snapshot-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  toast('STANDALONE HTML EXPORTED');
}
document.getElementById('html-btn').addEventListener('click', exportStandalone);

// ═══════════════════════════════════════════════════
// TIMELINE VIEW
// ═══════════════════════════════════════════════════
let timelineActive = false;
let minTime, maxTime;

function getGraphTimeRange() {
    let min = Infinity, max = -Infinity;
    if (nodes.length === 0) return { min: Date.now(), max: Date.now() };
    for (const node of nodes) {
        for (const entry of node.entries) {
            if (entry.addedAt < min) min = entry.addedAt;
            if (entry.addedAt > max) max = entry.addedAt;
        }
    }
    return { min: min === Infinity ? Date.now() : min, max: max === -Infinity ? Date.now() : max };
}

function renderTimelineViz() {
    const cvs = document.getElementById('timeline-canvas');
    const ctx = cvs.getContext('2d');
    const w = cvs.offsetWidth;
    const h = cvs.offsetHeight;
    cvs.width = w; cvs.height = h;
    ctx.clearRect(0, 0, w, h);

    if (nodes.length === 0) return;
    const range = maxTime - minTime;
    if (range <= 0) return;

    // Draw active clusters
    activeClusters.forEach((cluster) => {
        const topic = cluster.el.textContent || 'CLUSTER';
        let hash = 0;
        for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash);
        const hue = Math.abs(hash % 360);
        ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.globalAlpha = 0.7;

        cluster.ids.forEach(nodeId => {
            const n = nodes.find(x => x.id === nodeId);
            if (n) {
                n.entries.forEach(e => {
                    const pct = (e.addedAt - minTime) / range;
                    if (pct >= 0 && pct <= 1) {
                        ctx.fillRect(pct * w - 1, h/2 - 5, 2, 10);
                    }
                });
            }
        });
    });
}

function toggleTimelineView() {
    timelineActive = !timelineActive;
    const btn = document.getElementById('timeline-btn');
    const controls = document.getElementById('timeline-controls');
    btn.classList.toggle('active', timelineActive);
    controls.classList.toggle('visible', timelineActive);

    if (timelineActive) {
        const range = getGraphTimeRange();
        minTime = range.min;
        maxTime = range.max;
        if (minTime >= maxTime) { maxTime = minTime + 3600000; } // Add 1hr range if only one entry
        document.getElementById('timeline-slider').value = 1;
        updateTimelineView(1);
        setTimeout(renderTimelineViz, 50); // wait for layout
    } else {
        // Restore normal view
        nodes.forEach(node => {
            if (node.el) node.el.style.display = '';
            updateCubeEl(node);
        });
        document.getElementById('timeline-date-label').textContent = 'NOW';
    }
}

function updateTimelineView(sliderValue) {
    const timestamp = minTime + (maxTime - minTime) * sliderValue;
    document.getElementById('timeline-date-label').textContent = new Date(timestamp).toLocaleString().toUpperCase();

    for (const node of nodes) {
        if (!node.el) continue;
        const creationTime = node.entries.reduce((min, e) => Math.min(min, e.addedAt), Infinity);
        node.el.style.display = (creationTime > timestamp) ? 'none' : '';
        if(creationTime <= timestamp) {
            LENS_ORDER.forEach(lk=>{ const L=LENSES[lk]; const f=node.el.querySelector(`.face-${L.face}`); const p=node.el.querySelector(`.cube-pip[data-lens-key="${lk}"]`); if(f){ const e=node.entries.find(x=>x.lens===lk&&x.addedAt<=timestamp); _updateFace(f,p,e); } });
        }
    }
}

document.getElementById('timeline-btn').addEventListener('click', toggleTimelineView);
document.getElementById('timeline-slider').addEventListener('input', e => updateTimelineView(parseFloat(e.target.value)));

// ═══════════════════════════════════════════════════
// LAYER VIEW
// ═══════════════════════════════════════════════════
let activeLayerTab = 'fact';
let layerSplitMode = false;
let layerSplitB = 'counter';

function openLayerPanel(){
  const panel = document.getElementById('layer-panel');
  panel.style.display = 'flex';
  requestAnimationFrame(()=>panel.classList.add('open'));
  document.getElementById('layer-btn').classList.add('active');
  buildLayerTabs();
  renderLayerCards(activeLayerTab);
}
function closeLayerPanel(){
  const panel = document.getElementById('layer-panel');
  panel.classList.remove('open');
  document.getElementById('layer-btn').classList.remove('active');
  setTimeout(()=>{ panel.style.display='none'; }, 350);
}

function buildLayerTabs(){
  const bar = document.getElementById('layer-tabs');
  bar.innerHTML = '';
  LENS_ORDER.forEach(lk => {
    const L = LENSES[lk];
    const count = nodes.reduce((n,nd)=>n+(getLensEntry(nd,lk)?1:0), 0);
    const tab = document.createElement('button');
    tab.className = 'layer-tab' + (lk===activeLayerTab?' active':'');
    tab.dataset.lens = lk;
    tab.style.setProperty('--tab-lc', L.color);
    tab.innerHTML = `<span class="layer-tab-icon">${L.icon}</span>${L.name}<span class="layer-tab-count">${count}</span>`;
    tab.addEventListener('click', ()=>{
      activeLayerTab = lk;
      bar.querySelectorAll('.layer-tab').forEach(t=>t.classList.toggle('active', t.dataset.lens===lk));
      if(layerSplitMode) renderSplitView(); else renderLayerCards(lk);
    });
    bar.appendChild(tab);
  });
}

function renderLayerCards(lensKey, highlight=''){
  const L = LENSES[lensKey];
  const container = document.getElementById('layer-cards');
  container.classList.remove('split-active');
  container.innerHTML = '';

  const filled = nodes.filter(n=>getLensEntry(n,lensKey));
  const empty  = nodes.filter(n=>!getLensEntry(n,lensKey));

  if(!filled.length){
    container.innerHTML = `<div class="layer-empty"><div class="layer-empty-icon">${L.icon}</div>No ${L.name} entries yet.<br>Add entries via the ${L.name} face on any cube.</div>`;
    return;
  }

  filled.forEach(node=>{
    const entry = getLensEntry(node, lensKey);
    const card = document.createElement('div');
    card.className = 'layer-card';
    card.style.setProperty('--lc', L.color);
    const dateStr = new Date(entry.addedAt).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'2-digit'}).toUpperCase();
    const displayText = highlight ? highlightText(entry.text, highlight) : escHtml(entry.text);
    card.innerHTML = `
      <div class="lcard-header">
        <span class="lcard-icon">${L.icon}</span>
        <span class="lcard-topic">${escHtml(node.topic)}</span>
        <span class="lcard-date">${dateStr}</span>
      </div>
      <div class="lcard-text">${displayText}</div>
      <div class="lcard-jump">▶ Jump to cube in 3D</div>`;
    card.addEventListener('click', ()=>{ closeLayerPanel(); jumpToCube(node); });
    container.appendChild(card);
  });

  // Show empty-lens nodes as ghost cards
  if(empty.length){
    const ghost = document.createElement('div');
    ghost.style.cssText='grid-column:1/-1;font-size:8px;letter-spacing:3px;color:rgba(0,212,255,0.2);text-transform:uppercase;padding:14px 0 6px;border-top:1px solid rgba(0,212,255,0.08);margin-top:8px;';
    ghost.textContent = `${empty.length} cube${empty.length!==1?'s':''} missing this lens`;
    container.appendChild(ghost);
    empty.forEach(node=>{
      const card = document.createElement('div');
      card.className = 'layer-card';
      card.style.cssText = `--lc:${L.color};opacity:0.35;`;
      card.innerHTML = `
        <div class="lcard-header">
          <span class="lcard-icon" style="opacity:0.4">${L.icon}</span>
          <span class="lcard-topic">${escHtml(node.topic)}</span>
        </div>
        <div class="lcard-text" style="opacity:0.4;font-style:italic">No ${L.name} entry yet.</div>
        <div class="lcard-jump">▶ Tap face to add</div>`;
      card.addEventListener('click',()=>{ closeLayerPanel(); jumpToCube(node); openLensPicker(null,node,[lensKey]); });
      container.appendChild(card);
    });
  }
}

function renderSplitView() {
  const container = document.getElementById('layer-cards');
  container.classList.add('split-active');
  container.innerHTML = '';
  
  [activeLayerTab, layerSplitB].forEach((lk, idx) => {
    const L = LENSES[lk];
    const col = document.createElement('div');
    col.className = 'split-col';
    
    // Header with cycler for right column
    let ctrl = '';
    if(idx === 1) {
      ctrl = `<button class="split-cycle-btn" id="split-cycle-btn">CYCLE LENS ▶</button>`;
    }
    
    col.innerHTML = `
      <div class="split-header" style="--col-c:${L.color}">
        <div class="split-title">${L.icon} ${L.name}</div>
        ${ctrl}
      </div>
      <div class="split-body" id="split-body-${idx}"></div>
    `;
    container.appendChild(col);
    
    if(idx === 1) {
      col.querySelector('#split-cycle-btn').onclick = () => {
        const currIdx = LENS_ORDER.indexOf(layerSplitB);
        layerSplitB = LENS_ORDER[(currIdx + 1) % LENS_ORDER.length];
        renderSplitView();
      };
    }

    const body = col.querySelector(`.split-body`);
    const items = nodes.filter(n => getLensEntry(n, lk));
    
    if(!items.length) {
      body.innerHTML = `<div class="sc-empty">No ${L.name} entries found.</div>`;
    } else {
      items.forEach(node => {
        const entry = getLensEntry(node, lk);
        const card = document.createElement('div');
        card.className = 'split-card';
        card.style.setProperty('--col-c', L.color);
        card.innerHTML = `<div class="sc-topic">${escHtml(node.topic)}</div><div class="sc-text">${escHtml(entry.text)}</div>`;
        card.onclick = () => { closeLayerPanel(); jumpToCube(node); };
        body.appendChild(card);
      });
    }
  });
}

document.getElementById('layer-split-btn').addEventListener('click', (e) => {
  layerSplitMode = !layerSplitMode;
  e.target.classList.toggle('active', layerSplitMode);
  if(layerSplitMode) renderSplitView(); else renderLayerCards(activeLayerTab);
});

// Flash highlight a cube in 3D
function jumpToCube(node){
  if(!node.el) return;
  toast(`JUMPING TO ${node.topic.toUpperCase()}`);
  // Briefly illuminate the cube
  node.el.style.transition='filter 0.15s';
  node.el.style.filter='drop-shadow(0 0 30px rgba(0,212,255,1)) brightness(1.8)';
  setTimeout(()=>{ node.el.style.filter=''; }, 1200);
}

document.getElementById('layer-btn').addEventListener('click', openLayerPanel);
document.getElementById('layer-close').addEventListener('click', closeLayerPanel);

// ═══════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════
let searchFilters = new Set(LENS_ORDER); // all on by default
let searchDebounce = null;

function openSearchPanel(){
  const panel = document.getElementById('search-panel');
  panel.style.display = 'flex';
  requestAnimationFrame(()=>panel.classList.add('open'));
  document.getElementById('search-btn').classList.add('active');
  buildSearchFilters();
  document.getElementById('search-input').focus();
  runSearch();
}
function closeSearchPanel(){
  const panel = document.getElementById('search-panel');
  panel.classList.remove('open');
  document.getElementById('search-btn').classList.remove('active');
  setTimeout(()=>{ panel.style.display='none'; },350);
}

function buildSearchFilters(){
  const bar = document.getElementById('search-filters');
  bar.innerHTML = '';
  // ALL chip
  const allChip = document.createElement('button');
  allChip.className = 'sf-chip' + (searchFilters.size===LENS_ORDER.length?' on':'');
  allChip.style.setProperty('--chip-c','var(--holo)');
  allChip.textContent = 'ALL';
  allChip.addEventListener('click',()=>{
    if(searchFilters.size===LENS_ORDER.length) searchFilters=new Set();
    else searchFilters=new Set(LENS_ORDER);
    buildSearchFilters(); runSearch();
  });
  bar.appendChild(allChip);

  LENS_ORDER.forEach(lk=>{
    const L=LENSES[lk];
    const chip=document.createElement('button');
    chip.className='sf-chip'+(searchFilters.has(lk)?' on':'');
    chip.style.setProperty('--chip-c',L.color);
    chip.innerHTML=`${L.icon} ${L.name}`;
    chip.addEventListener('click',()=>{
      if(searchFilters.has(lk)) searchFilters.delete(lk); else searchFilters.add(lk);
      buildSearchFilters(); runSearch();
    });
    bar.appendChild(chip);
  });
}

function runSearch(){
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const metaEl = document.getElementById('search-results-meta');
  const resultsEl = document.getElementById('search-results');
  resultsEl.innerHTML='';

  if(!q){
    // Show all entries grouped by cube when no query
    let allItems=[];
    nodes.forEach(node=>{
      node.entries.filter(e=>searchFilters.has(e.lens)).forEach(e=>{
        allItems.push({node,entry:e});
      });
    });
    metaEl.textContent=`${allItems.length} entr${allItems.length!==1?'ies':'y'} · ${nodes.length} cubes`;
    if(!allItems.length){
      resultsEl.innerHTML=`<div class="search-no-results"><div class="snr-icon">⌕</div>No entries stored yet.</div>`;
      return;
    }
    allItems.forEach(({node,entry})=>resultsEl.appendChild(makeResultItem(node,entry,'')));
    return;
  }

  // Keyword search — tokenise query, match against entry text
  const qWords = q.split(/\s+/).filter(w=>w.length>0);
  const results=[];

  nodes.forEach(node=>{
    node.entries.filter(e=>searchFilters.has(e.lens)).forEach(entry=>{
      const haystack = (entry.text+' '+node.topic).toLowerCase();
      const matchCount = qWords.filter(w=>haystack.includes(w)).length;
      const exactMatch = haystack.includes(q);
      if(matchCount>0){
        const score = exactMatch ? 1000+matchCount : matchCount;
        results.push({node,entry,score});
      }
    });
  });

  results.sort((a,b)=>b.score-a.score);
  metaEl.textContent = results.length
    ? `${results.length} result${results.length!==1?'s':''} for "${q}"`
    : `No results for "${q}"`;

  if(!results.length){
    resultsEl.innerHTML=`<div class="search-no-results"><div class="snr-icon">⌕</div>No matches found.<br>Try different keywords or adjust lens filters.</div>`;
    return;
  }

  results.forEach(({node,entry})=>resultsEl.appendChild(makeResultItem(node,entry,q)));
}

function makeResultItem(node, entry, query){
  const L=LENSES[entry.lens];
  const item=document.createElement('div');
  item.className='sr-item';
  item.style.setProperty('--lc',L.color);
  const dateStr=new Date(entry.addedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}).toUpperCase();
  const displayText = query ? highlightText(entry.text, query) : escHtml(entry.text);
  item.innerHTML=`
    <div class="sr-lens-strip"></div>
    <div class="sr-body">
      <div class="sr-meta">
        <span class="sr-lens-badge">${L.icon} ${L.name}</span>
        <span class="sr-topic">${escHtml(node.topic)}</span>
        <span class="sr-date" style="font-size:7px;color:rgba(255,255,255,0.15);letter-spacing:1px;">${dateStr}</span>
      </div>
      <div class="sr-text">${displayText}</div>
      <div class="sr-jump">▶ Jump to cube in 3D</div>
    </div>`;
  item.addEventListener('click',()=>{ closeSearchPanel(); jumpToCube(node); });
  return item;
}

// Highlight matching text
function highlightText(text, query){
  if(!query) return escHtml(text);
  const escaped = escHtml(text);
  const qEsc = query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return escaped.replace(new RegExp(`(${qEsc})`, 'gi'), '<mark>$1</mark>');
}

function escHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

document.getElementById('search-btn').addEventListener('click', openSearchPanel);
document.getElementById('search-close').addEventListener('click', closeSearchPanel);
document.getElementById('search-input').addEventListener('input', ()=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(runSearch, 160);
});
document.getElementById('search-input').addEventListener('keydown', e=>{ if(e.key==='Escape') closeSearchPanel(); });

// Keyboard shortcut: Ctrl/Cmd+F → search, Ctrl/Cmd+L → layers, Esc closes panels
window.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='f'){ e.preventDefault(); openSearchPanel(); }
  if((e.ctrlKey||e.metaKey)&&e.key==='r'){ e.preventDefault(); randomWalk(); }
  if((e.ctrlKey||e.metaKey)&&e.key==='l'){ e.preventDefault(); openLayerPanel(); }
  if(e.key==='Escape'){
    if(document.getElementById('search-panel').classList.contains('open')) closeSearchPanel();
    else if(document.getElementById('timeline-controls').classList.contains('visible')) toggleTimelineView();
    else if(document.getElementById('layer-panel').classList.contains('open')) closeLayerPanel();
  }
});

// ═══════════════════════════════════════════════════
// PHASE 13: VOICE INPUT (WEB SPEECH API)
// ═══════════════════════════════════════════════════
const voiceBtn = document.getElementById('voice-btn');
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  voiceBtn.addEventListener('click', () => recognition.start());

  recognition.onstart = () => { toast('LISTENING...'); voiceBtn.classList.add('listening'); };
  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    document.getElementById('data-input').value = text;
    addEntry(text);
    document.getElementById('data-input').value = '';
  };
  recognition.onerror = (e) => toast(e.error === 'no-speech' ? 'NO SPEECH DETECTED' : 'VOICE INPUT FAILED');
  recognition.onend = () => voiceBtn.classList.remove('listening');

} else {
  voiceBtn.style.display = 'none';
}

// ═══════════════════════════════════════════════════
// PHASE 14: BOOKMARKS / SAVED VIEWS
// ═══════════════════════════════════════════════════
function openBookmarkPanel(){
  const panel = document.getElementById('bookmark-panel');
  panel.style.display = 'flex';
  requestAnimationFrame(()=>panel.classList.add('open'));
  document.getElementById('bookmark-btn').classList.add('active');
  renderBookmarks();
  document.getElementById('bookmark-input').focus();
}
function closeBookmarkPanel(){
  const panel = document.getElementById('bookmark-panel');
  panel.classList.remove('open');
  document.getElementById('bookmark-btn').classList.remove('active');
  setTimeout(()=>{ panel.style.display='none'; },350);
}

function saveView() {
  const name = document.getElementById('bookmark-input').value.trim();
  if(!name) return;
  const views = JSON.parse(localStorage.getItem('datacube_views') || '{}');
  views[name] = { az, el, zoom };
  localStorage.setItem('datacube_views', JSON.stringify(views));
  toast(`VIEW SAVED: ${name.toUpperCase()}`);
  document.getElementById('bookmark-input').value = '';
  renderBookmarks();
}

function loadView(name) {
  const views = JSON.parse(localStorage.getItem('datacube_views') || '{}');
  const view = views[name];
  if(view) {
    az = view.az; el = view.el; zoom = view.zoom;
    applyOrbit();
    toast(`VIEW LOADED: ${name.toUpperCase()}`);
    closeBookmarkPanel();
  }
}

function deleteView(name) {
  const views = JSON.parse(localStorage.getItem('datacube_views') || '{}');
  if(views[name]) {
    delete views[name];
    localStorage.setItem('datacube_views', JSON.stringify(views));
    renderBookmarks();
  }
}

function renderBookmarks() {
  const list = document.getElementById('bookmark-list');
  const views = JSON.parse(localStorage.getItem('datacube_views') || '{}');
  list.innerHTML = '';
  if(Object.keys(views).length === 0) {
    list.innerHTML = '<div style="text-align:center;color:rgba(0,212,255,0.3);font-size:9px;letter-spacing:2px;margin-top:20px;">NO SAVED VIEWS</div>';
    return;
  }
  Object.keys(views).forEach(name => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    item.innerHTML = `<span class="bi-name">${escHtml(name)}</span><div class="bi-del">×</div>`;
    item.querySelector('.bi-name').onclick = () => loadView(name);
    item.querySelector('.bi-del').onclick = (e) => { e.stopPropagation(); deleteView(name); };
    list.appendChild(item);
  });
}

document.getElementById('bookmark-btn').addEventListener('click', openBookmarkPanel);
document.getElementById('bookmark-close').addEventListener('click', closeBookmarkPanel);
document.getElementById('bookmark-save-btn').addEventListener('click', saveView);
document.getElementById('bookmark-input').addEventListener('keydown', e => { if(e.key==='Enter') saveView(); });

document.getElementById('batch-clear-btn').addEventListener('click', clearSelection);
document.getElementById('batch-delete-btn').addEventListener('click', batchDelete);
document.getElementById('batch-export-btn').addEventListener('click', batchExport);
document.getElementById('batch-merge-btn').addEventListener('click', batchMerge);


// ═══════════════════════════════════════════════════
// PHASE 15: STATISTICS DASHBOARD
// ═══════════════════════════════════════════════════
function showStats() {
  const totalCubes = nodes.length;
  if (totalCubes === 0) {
    toast('📊 NO DATA TO ANALYZE YET.');
    return;
  }
  const totalEntries = nodes.reduce((s, n) => s + n.entries.length, 0);
  const completeCubes = nodes.filter(n => n.entries.length === 6).length;
  const avgCompleteness = (totalEntries / (totalCubes * 6) * 100).toFixed(1);

  const topKeywords = new Map();
  nodes.forEach(n => {
    for (const [k, v] of n.memory) {
      if (!k.includes('_')) { // Exclude bigrams for cleaner summary
        topKeywords.set(k, (topKeywords.get(k) || 0) + v);
      }
    }
  });
  const top10 = [...topKeywords.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const statsText = `📊 STATS
Cubes: ${totalCubes}
Entries: ${totalEntries}
Complete: ${completeCubes}
Avg fill: ${avgCompleteness}%
Top: ${top10.map(([k]) => k).join(' · ')}`;
  toast(statsText, 8000);
}
document.getElementById('stats-btn').addEventListener('click', showStats);

// ═══════════════════════════════════════════════════
// PHASE 18: RANDOM DISCOVERY MODE
// ═══════════════════════════════════════════════════
function randomWalk() {
  if(nodes.length === 0) {
    toast('NO CUBES TO DISCOVER YET.');
    return;
  }
  const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
  jumpToCube(randomNode);
  
  // Also show a random entry from that cube
  if(randomNode.entries.length) {
    const randomEntry = randomNode.entries[Math.floor(Math.random() * randomNode.entries.length)];
    toast(`🔍 DISCOVERY: ${LENSES[randomEntry.lens].icon} ${randomEntry.text.substring(0,80)}...`, 4000);
  }
}
document.getElementById('discovery-btn').addEventListener('click', randomWalk);

// ═══════════════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════════════
const themeBtn = document.getElementById('theme-btn');
const moonIcon = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M9.5 8.5a4 4 0 11-7-7 6 6 0 007 7z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const sunIcon = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="2" stroke="currentColor" stroke-width="1.3"/><path d="M6 1V2M6 10V11M10 6H11M1 6H2M8.5 3.5L9 3M3 9L3.5 8.5M8.5 8.5L9 9M3 3L3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
const termIcon = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2l3 3-3 3M6 10h5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function applyTheme(theme) {
    document.body.classList.remove('light-theme', 'terminal-theme');
    if (theme === 'light') document.body.classList.add('light-theme');
    if (theme === 'terminal') document.body.classList.add('terminal-theme');
    
    let icon = moonIcon;
    if (theme === 'light') icon = sunIcon;
    if (theme === 'terminal') icon = termIcon;
    
    themeBtn.innerHTML = icon + 'THEME';
    localStorage.setItem('datacube_theme', theme);
}

themeBtn.addEventListener('click', () => {
    const current = localStorage.getItem('datacube_theme') || 'dark';
    const next = current === 'dark' ? 'light' : (current === 'light' ? 'terminal' : 'dark');
    applyTheme(next);
}
);

// ═══════════════════════════════════════════════════
// PHASE 12: COLLABORATIVE MODE (WEBSOCKET)
// ═══════════════════════════════════════════════════
const COLLAB_ENABLE = false; // Toggle to enable

if(COLLAB_ENABLE && window.WebSocket) {
  const ws = new WebSocket('wss://your-server.com/datacube');
  
  ws.onmessage = (e) => {
    IS_REMOTE_ACTION = true;
    const data = JSON.parse(e.data);
    if(data.type === 'new-cube') {
      // Add remote cube
      const node = makeNode(data.topic);
      node.id = data.id; // preserve remote ID
      nextId = Math.max(nextId, data.id + 1); // Prevent local ID collision
      nodes.push(node);
      createCubeEl(node);
      data.entries.forEach(e => commitToLens(e.text, node, e.lens));
    }
    if(data.type === 'move') {
      const node = nodes.find(n => n.id === data.id);
      if(node) {
        node.position = data.pos;
        if(node.el) node.el.style.transform = `translate3d(${node.position.x-75}px,${node.position.y-75}px,${node.position.z}px)`;
      }
    }
    IS_REMOTE_ACTION = false;
  };
  
  // Broadcast local changes
  const origCommit = commitToLens;
  commitToLens = function(text, node, lensKey) {
    origCommit(text, node, lensKey);
    if(!IS_REMOTE_ACTION && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({type:'new-entry', id:node.id, lens:lensKey, text}));
    }
  };
}

// ═══════════════════════════════════════════════════
// STAR FIELD
// ═══════════════════════════════════════════════════
(function(){
  const c=document.getElementById('stars'),ctx=c.getContext('2d');let W,H,stars=[],mx=0,my=0;
  function resize(){W=c.width=innerWidth;H=c.height=innerHeight;}
  function make(){stars=Array.from({length:180},()=>({x:Math.random()*W,y:Math.random()*H,z:Math.random()*1.5+0.1,r:Math.random()*1.1,a:Math.random(),sp:0.0003+Math.random()*0.0008,ph:Math.random()*Math.PI*2}));}
  window.addEventListener('mousemove',e=>{mx=(e.clientX-W/2)*0.03;my=(e.clientY-H/2)*0.03;});
  function draw(t){ctx.clearRect(0,0,W,H);stars.forEach(s=>{const a=s.a*(0.4+0.6*Math.sin(t*s.sp*1000+s.ph));ctx.beginPath();ctx.arc(s.x-mx*s.z,s.y-my*s.z,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(180,230,255,${a})`;ctx.fill();});requestAnimationFrame(draw);}
  resize();make();addEventListener('resize',()=>{resize();make();});requestAnimationFrame(draw);
})();

// ═══════════════════════════════════════════════════
// TUTORIAL: THE ARCHITYPE
// ═══════════════════════════════════════════════════
const TUTORIAL_STEPS = [
  {
    title: "WELCOME TO THE ARCHITYPE",
    text: "This is a holographic knowledge engine. It does not store lists; it builds a living 3D structure of your thoughts.",
    target: null
  },
  {
    title: "THE INPUT",
    text: "Feed the system here. Enter a fact, an idea, or a note. The system will analyze it and position it in 3D space.",
    target: "#input-bar"
  },
  {
    title: "THE CUBE",
    text: "Data isn't flat. Every topic is a cube with 6 lenses: Fact, Counter, Opinion, Fiction, Context, and Unknown. Rotate your view to see them all.",
    target: "#stage"
  },
  {
    title: "CONNECTIONS",
    text: "As you add data, related cubes will find each other. Gravity pulls similar topics together into clusters. The structure organizes itself.",
    target: null
  },
  {
    title: "BEGIN",
    text: "The system is empty. It is waiting for you to build the first connection.",
    target: null
  }
];

let tutStep = 0;

function initTutorial() {
  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.innerHTML = `<div id="tutorial-spotlight"></div><div id="tutorial-card"><div class="tut-title" id="tut-title"></div><div class="tut-text" id="tut-text"></div><button class="tut-btn" id="tut-next">NEXT STEP</button></div>`;
  document.body.appendChild(overlay);
  document.getElementById('tut-next').onclick = nextTutorialStep;
}

function startTutorial() {
  if(localStorage.getItem('architype_tutorial_completed')) return;
  tutStep = 0;
  document.getElementById('tutorial-overlay').classList.add('active');
  renderTutorialStep();
}

function renderTutorialStep() {
  const step = TUTORIAL_STEPS[tutStep];
  document.getElementById('tut-title').textContent = step.title;
  document.getElementById('tut-text').textContent = step.text;
  document.getElementById('tut-next').textContent = tutStep === TUTORIAL_STEPS.length - 1 ? "INITIALIZE SYSTEM" : "NEXT ▶";
  
  const spot = document.getElementById('tutorial-spotlight');
  if(step.target) {
    const el = document.querySelector(step.target);
    const rect = el.getBoundingClientRect();
    spot.style.top = rect.top + 'px'; spot.style.left = rect.left + 'px';
    spot.style.width = rect.width + 'px'; spot.style.height = rect.height + 'px';
    spot.style.opacity = '1';
  } else {
    spot.style.opacity = '0';
  }
}

function nextTutorialStep() {
  tutStep++;
  if(tutStep >= TUTORIAL_STEPS.length) {
    document.getElementById('tutorial-overlay').classList.remove('active');
    localStorage.setItem('architype_tutorial_completed', 'true');
    toast("SYSTEM ONLINE");
  } else {
    renderTutorialStep();
  }
}

// ═══════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════
const savedTheme = localStorage.getItem('datacube_theme') || 'dark';
applyTheme(savedTheme);

// RENAME TO ARCHITYPE
const logoEl = document.querySelector('.logo');
if(logoEl) logoEl.textContent = 'THE ARCHITYPE';
document.title = 'The Architype';

initTutorial();

const restored=loadState();
if(restored && nodes.length>2) detectClusters();
if(!restored){
  const node=makeNode('LIGHT SPEED');
  nodes.push(node);
  const el=createCubeEl(node);
  commitToLens('The speed of light in a vacuum is exactly 299,792,458 metres per second.',node,'fact');
  commitToLens('This absolute limit may not apply in exotic spacetime topologies like warp metrics.',node,'counter');
  commitToLens('Light feels instantaneous in daily life — the delay to the Moon is still under 2 seconds.',node,'opinion');
  commitToLens('In the Expanse universe, generation ships still can\'t beat the light barrier, making humanity forever local.',node,'fiction');
  commitToLens('The constant c was fixed by definition in 1983, making the metre dependent on it rather than vice versa.',node,'context');
  commitToLens('Whether faster-than-light information transfer is truly impossible under all future physics remains open.',node,'unknown');
  el.classList.add('appearing'); setTimeout(()=>el.classList.remove('appearing'),800);
  updateMeta();
  saveState();
}

tickGravity();
setTimeout(startTutorial, 1000); // Delay slightly for effect