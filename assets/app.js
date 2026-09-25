/* ---------- setup ---------- */
const LANG = (window.PAGE_LANG && UI[window.PAGE_LANG]) ? window.PAGE_LANG : "en";
const U = UI[LANG];
const TKEYS = Object.keys(TRAITS);
const $ = s => document.querySelector(s);
const fmt = (s, v) => String(s).replace(/\{n\}/g, v);
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function store(k,v){try{if(v===undefined){const x=localStorage.getItem(k);return x?JSON.parse(x):null}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
const seedNow=()=>Math.floor(Math.random()*1e9);

// translation language: Korean UI shows English as its translation
const TRL = LANG === "ko" ? "en" : LANG;
const T_ = (typeof TR !== "undefined" && TR[TRL]) || null;

const ITEMS=[];let gi=0;
FACETS.forEach((f,fi)=>f[2].forEach((it,k)=>{ITEMS.push({id:`f${fi}_${k}`,f:fi,trait:f[0],facet:f[1],rev:!!it[0],ko:it[1],en:it[2],n:gi});gi++}));
const LIES=LIE.map((l,i)=>({id:`l${i}`,lie:true,trait:"L",rev:false,ko:l[0],en:l[1],n:i}));
const trItem=it=>it.lie?(T_?T_.lie[it.n]:it.en):(T_?T_.items[it.n]:it.en);
const trSjt=(s,i)=>{const k=s.k;if(T_)return{q:T_.sjt[k][0],o:T_.sjt[k][1],why:T_.sjt[k][2]};return{q:s.en,o:s.o.map(o=>o[1]),why:s.why}};
SJT.forEach((s,i)=>s.k=i);
const byFacet=fi=>ITEMS.filter(i=>i.f===fi);

function likertSet(seed,perTrait,lieN,ipf){
  const r=rng(seed);ipf=ipf||4;let facets=[];
  TKEYS.forEach((t,ti)=>{const ids=FACETS.map((f,i)=>f[0]===t?i:-1).filter(i=>i>=0);const n=typeof perTrait==="function"?perTrait(ti):perTrait;facets=facets.concat(shuffle(ids,r).slice(0,n))});
  const groups=facets.map(fi=>shuffle(byFacet(fi),r).slice(0,ipf));
  let out=[];for(let k=0;k<ipf;k++)out=out.concat(shuffle(groups.map(g=>g[k]).filter(Boolean),r));
  shuffle(LIES,r).slice(0,lieN).forEach(l=>out.splice(Math.floor(r()*(out.length+1)),0,l));
  return out;
}
function fcBlocks(seed,n){
  const r=rng(seed);const pools={};
  ITEMS.filter(i=>!i.rev).forEach(i=>(pools[i.trait]=pools[i.trait]||[]).push(i));
  TKEYS.forEach(k=>pools[k]=shuffle(pools[k],r));
  const idx={};const blocks=[];
  for(let b=0;b<n;b++){const ts=shuffle(TKEYS,r).slice(0,4);blocks.push(ts.map(t=>{idx[t]=idx[t]||0;return pools[t][idx[t]++%pools[t].length]}))}
  return blocks;
}
const MOCKS=[];
for(let m=1;m<=10;m++)MOCKS.push({id:"mock"+m,kind:"likert",n:m,build:()=>likertSet(1000+m*7919,ti=>((m+ti)%2?3:2),6),mins:12});
const OTHER=[
 {id:"full",kind:"likert",build:()=>likertSet(seedNow(),8,12),mins:40,count:236},
 {id:"speed",kind:"likert",build:()=>likertSet(seedNow(),ti=>ti<2?2:1,4,4).slice(0,40),perItem:7,count:40},
 {id:"forced",kind:"forced",build:()=>fcBlocks(seedNow(),24),mins:12,count:24},
 {id:"yesno",kind:"yesno",build:()=>likertSet(seedNow(),ti=>ti%3===0?2:1,6,4),mins:7,count:46},
 {id:"sjt1",kind:"sjt",build:()=>SJT.slice(0,15),mins:12,count:15},
 {id:"sjt2",kind:"sjt",build:()=>SJT.slice(15),mins:12,count:15},
 {id:"sjtr",kind:"sjt",build:()=>shuffle(SJT,rng(seedNow())).slice(0,15),mins:12,count:15}
];
const TESTS=[...MOCKS,...OTHER];
const tName=t=>t.id.startsWith("mock")?fmt(U.mock,t.n):U["t_"+t.id][0];
const tDesc=t=>U["t_"+t.id][1];

let S={mode:store("ip_mode")||(LANG==="ko"?"exam":"show")};
let T=null,timerId=null;
function setMode(m){S.mode=m;store("ip_mode",m);home(true)}
function hist(){return store("ip_hist")||[]}
function lastFor(id){const h=hist();for(let i=h.length-1;i>=0;i--)if(h[i].id===id)return h[i];return null}

/* ---------- home ---------- */
function home(keepScroll){
  clearInterval(timerId);T=null;document.body.classList.remove("testing");
  const h=hist();
  const mocksDone=MOCKS.filter(m=>lastFor(m.id)).length;
  const done=[true,mocksDone>=3,!!(lastFor("sjt1")||lastFor("sjt2")||lastFor("sjtr")),!!lastFor("full")];
  const titleParts=U.hero_title.split("인성검사");
  const title=titleParts.length>1?esc(titleParts[0])+"<em>인성검사</em>"+esc(titleParts.slice(1).join("인성검사")):esc(U.hero_title);
  $("#app").innerHTML=`
  <div class="hero">
    <div><span class="eyebrow">${esc(U.hero_eyebrow)}</span>
      <h1>${title}</h1><p class="sub">${esc(U.hero_sub)}</p>
      <div class="ctas"><button class="btn" data-start="mock1">${esc(U.cta_start)} →</button><button class="btn ghost" data-start="full">${esc(U.cta_full)}</button></div></div>
    <div class="demo" aria-hidden="true"><div class="tag">문항 1</div><p class="dq">${esc(U.demo_q)}</p>${U.demo_t?`<p class="dt">${esc(U.demo_t)}</p>`:`<p class="dt">&nbsp;</p>`}
      <div class="row6">${[1,2,3,4,5,6].map(n=>`<span class="${n===5?"on":""}">${n}</span>`).join("")}</div>
      <div class="stats3"><div><b>100%</b><small>${esc(U.consistency.replace(/\s*[（(].*[)）]/,""))}</small></div><div><b>0/6</b><small>${esc(U.too_perfect)}</small></div><div><b>6.1s</b><small>${esc(U.avg)}</small></div></div></div>
  </div>
  <section class="block"><div class="sec-head"><h2>${esc(U.path_title)}</h2></div>
    <div class="path">${U.path.map((p,i)=>`<div class="step ${done[i]&&i>0?"done":""}"><h3>${esc(p[0])}</h3><p>${esc(p[1])}</p></div>`).join("")}</div></section>
  <section class="block" id="tests">
    <div class="mode"><strong>${esc(U.mode_title)}</strong>
      <div class="seg" role="group" aria-label="${esc(U.mode_title)}"><button id="m-show" aria-pressed="${S.mode==="show"}">${esc(U.mode_show)}</button><button id="m-exam" aria-pressed="${S.mode==="exam"}">${esc(U.mode_exam)}</button></div>
      <p>${esc(U.mode_note)}</p></div>
    <div class="sec-head"><h2>${esc(U.mocks_title)}</h2><p>${esc(U.mocks_desc)}</p></div>
    <div class="mockgrid">${MOCKS.map(t=>{const l=lastFor(t.id);const p=l&&l.c!=null?l.c:0;return `<button class="mock" data-start="${t.id}" aria-label="${esc(tName(t))}"><span class="ring" style="--p:${p}"><b>${t.n}</b></span><span>${l?(l.c!=null?fmt(U.cons_short,l.c):"✓"):esc(U.not_taken)}</span></button>`}).join("")}</div>
  </section>
  <section class="block"><div class="sec-head"><h2>${esc(U.formats_title)}</h2></div>
    <div class="cards">${OTHER.map(t=>{const l=lastFor(t.id);const time=t.perItem?`${t.perItem} ${U.s_item}`:`${t.mins} ${U.min}`;
      return `<div class="card"><span class="chip ${t.kind}">${esc(U["k_"+t.kind])}</span><h3>${esc(tName(t))}</h3><p>${esc(tDesc(t))}</p>
      <div class="meta"><span>${t.count} ${esc(t.kind==="forced"?U.blocks:U.items)}</span><span>${time}</span>${l?`<span>${esc(U.last)}: ${l.c!=null?l.c+"%":"✓"}</span>`:""}</div>
      <button class="btn small" data-start="${t.id}">${esc(U.start)}</button></div>`}).join("")}</div></section>
  <section class="block two">
    <div class="panel"><h2>${esc(U.tips_title)}</h2><ul class="tips">${U.tips.map(t=>`<li><span>${esc(t)}</span></li>`).join("")}</ul></div>
    <div class="panel"><h2>${esc(U.hist_title)}</h2>
      ${h.length?`<div class="tablewrap"><table class="hist"><thead><tr>${U.hist_cols.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>
      ${h.slice(-8).reverse().map(x=>{const t=TESTS.find(t=>t.id===x.id);return `<tr><td class="mono">${esc(x.d)}</td><td>${esc(t?tName(t):x.t)}</td><td class="mono">${x.c==null?"–":x.c+"%"}</td><td class="mono">${x.f==null?"–":x.f}</td><td class="mono">${x.x==null?"–":x.x+"%"}</td></tr>`}).join("")}
      </tbody></table></div><div id="clr-area"><button class="btn ghost small" id="clr" style="margin-top:12px">${esc(U.clear)}</button></div>`
      :`<p class="muted" style="margin:0">${esc(U.hist_empty)}</p>`}</div></section>
  <section class="block"><div class="sec-head"><h2>${esc(U.gloss_title)}</h2></div>
    <div class="gloss">${GLOSS_KO.map((k,i)=>`<div><b>${esc(k)}</b><i>${esc(U.gloss[i])}</i></div>`).join("")}</div></section>`;
  $("#m-show").onclick=()=>setMode("show");$("#m-exam").onclick=()=>setMode("exam");
  document.querySelectorAll("[data-start]").forEach(b=>b.onclick=()=>start(b.dataset.start));
  const c=$("#clr");if(c)c.onclick=()=>{$("#clr-area").innerHTML=`<div class="confirm"><span>${esc(U.clear_q)}</span><span style="display:flex;gap:8px"><button class="btn ghost small" id="no">${esc(U.keep)}</button><button class="btn small" id="yes">${esc(U.del)}</button></span></div>`;$("#no").onclick=()=>home(true);$("#yes").onclick=()=>{store("ip_hist",[]);home(true)}};
  if(!keepScroll)window.scrollTo(0,0);
}

/* ---------- run ---------- */
function start(id){
  const def=TESTS.find(t=>t.id===id);
  T={def,items:def.build(),i:0,ans:{},peeks:0,t0:Date.now(),itemStart:Date.now(),times:{},left:def.mins?def.mins*60:null,itemLeft:def.perItem||null,shown:{},cheered:{}};
  document.body.classList.add("testing");
  clearInterval(timerId);timerId=setInterval(tick,1000);q();window.scrollTo(0,0);
}
function tick(){
  if(!T)return;
  if(T.left!=null){T.left--;if(T.left<=0){finish();return}}
  if(T.itemLeft!=null){T.itemLeft--;if(T.itemLeft<=0){next();return}}
  const c=$("#clock");if(c){c.textContent=clockText();c.classList.toggle("low",(T.left!=null&&T.left<=60)||(T.itemLeft!=null&&T.itemLeft<=2))}
}
function clockText(){const s=T.left!=null?T.left:T.itemLeft;const m=Math.floor(s/60),x=s%60;return T.left!=null?`${m}:${String(x).padStart(2,"0")}`:`${x}s`}
const showTr=()=>S.mode==="show"||T.shown[T.i];
function bar(){
  const n=T.items.length,done=Object.keys(T.ans).length;
  return `<div class="bar"><span class="t">${esc(tName(T.def))}</span>
  <span style="display:flex;gap:10px;align-items:center"><span class="mono muted">${T.i+1} / ${n}</span><span class="pill-clock" id="clock">${clockText()}</span>
  <span id="quit-area"><button class="btn ghost small" id="quit">${esc(U.finish_now)}</button></span></span>
  <div class="prog" aria-hidden="true"><i style="width:${done/n*100}%"></i></div></div>`;
}
function trLine(text){if(!text)return "";if(showTr())return `<p class="tr-line">${esc(text)}</p>`;return `<button class="peek" id="peek">${esc(U.peek)}</button>`}
const SCALE_C=["var(--coral)","var(--coral)","var(--sun)","var(--sky)","var(--mint)","var(--mint)"];
function q(){
  const it=T.items[T.i];T.itemStart=Date.now();if(T.def.perItem)T.itemLeft=T.def.perItem;
  const k=T.def.kind;let body="";const hk=S.mode==="exam"?esc(U.key_h):"";
  if(k==="likert"||k==="yesno"){
    const a=T.ans[it.id];
    const opts=k==="likert"?U.likert.map((l,x)=>`<button class="bub" style="--c:${SCALE_C[x]}" data-v="${x+1}" aria-pressed="${a===x+1}" aria-label="${x+1} ${esc(l)}"><span class="o">${x+1}</span><small>${esc(UI.ko.likert[x])}${LANG!=="ko"&&S.mode==="show"?"<br>"+esc(l):""}</small></button>`).join("")
      :[[UI.ko.yes,U.yes,1,"var(--mint)"],[UI.ko.no_,U.no_,0,"var(--coral)"]].map(o=>`<button class="bub" style="--c:${o[3]}" data-v="${o[2]}" aria-pressed="${a===o[2]}"><span class="o">${o[0][0]}</span><small>${esc(o[0])}${S.mode==="show"&&LANG!=="ko"?"<br>"+esc(o[1]):""}</small></button>`).join("");
    const anchors="";
    body=`<div class="sheet"><div class="qnum">문항 ${T.i+1}</div><p class="stmt">${esc(it.ko)}</p>${trLine(trItem(it))}
      <div class="scale ${k==="yesno"?"two":""}">${opts}</div>${anchors}</div>
      <div class="nav"><button class="btn ghost small" id="prev" ${T.i===0||T.def.perItem?"disabled":""}>← ${esc(U.prev)}</button><button class="btn small" id="nx">${esc(T.i===T.items.length-1?U.finish:U.next)} →</button></div>
      <p class="keys">${esc(k==="likert"?U.keys_likert:U.keys_yesno)}${hk}</p>`;
  } else if(k==="forced"){
    const a=T.ans[T.i]||{};
    body=`<div class="sheet"><div class="qnum">문항 ${T.i+1}</div><p class="stmt" style="font-size:19px">다음 중 자신과 가장 가까운 것(M)과 가장 먼 것(L)을 고르시오.</p>${LANG==="ko"?"":trLine(U.fc_instr)}
      <div class="tablewrap"><table class="fc"><thead><tr><th>${esc(U.fc_stmt)}</th><th>M</th><th>L</th></tr></thead><tbody>
      ${it.map((s,x)=>`<tr><td class="s">${esc(s.ko)}${showTr()?`<small>${esc(trItem(s))}</small>`:""}</td>
      <td class="c"><button class="mini" data-m="${x}" aria-pressed="${a.m===x}" aria-label="M">M</button></td>
      <td class="c"><button class="mini l" data-l="${x}" aria-pressed="${a.l===x}" aria-label="L">L</button></td></tr>`).join("")}
      </tbody></table></div></div>
      <div class="nav"><button class="btn ghost small" id="prev" ${T.i===0?"disabled":""}>← ${esc(U.prev)}</button><button class="btn small" id="nx" ${a.m==null||a.l==null?"disabled":""}>${esc(T.i===T.items.length-1?U.finish:U.next)} →</button></div>
      <p class="keys">${esc(U.keys_fc)}${hk}</p>`;
  } else {
    const a=T.ans[T.i];const tr=trSjt(it);
    body=`<div class="sheet"><div class="qnum">상황 ${T.i+1}</div><p class="stmt" style="font-size:20px">${esc(it.ko)}</p>${trLine(tr.q)}
      <p class="muted" style="margin:12px 0 0;font-size:14px">가장 적절한 행동은?${showTr()&&LANG!=="ko"?" · "+esc(U.sjt_prompt):""}</p>
      <div class="opts-list">${it.o.map((o,x)=>`<button class="opt" data-o="${x}" aria-pressed="${a===x}"><span class="l">${"ABCD"[x]}</span><span>${esc(o[0])}${showTr()?`<small>${esc(tr.o[x])}</small>`:""}</span></button>`).join("")}</div></div>
      <div class="nav"><button class="btn ghost small" id="prev" ${T.i===0?"disabled":""}>← ${esc(U.prev)}</button><button class="btn small" id="nx" ${a==null?"disabled":""}>${esc(T.i===T.items.length-1?U.finish:U.next)} →</button></div>
      <p class="keys">${esc(U.keys_sjt)}${hk}</p>`;
  }
  $("#app").innerHTML=bar()+body;
  $("#quit").onclick=()=>{$("#quit-area").innerHTML=`<span style="display:flex;gap:6px;align-items:center"><span class="muted" style="font-size:13px">${esc(U.end_q)}</span><button class="btn ghost small" id="qno">${esc(U.no)}</button><button class="btn small" id="qyes">${esc(U.end)}</button></span>`;$("#qno").onclick=q;$("#qyes").onclick=finish};
  const pk=$("#peek");if(pk)pk.onclick=peek;
  document.querySelectorAll(".bub").forEach(b=>b.onclick=()=>answer(it.id,+b.dataset.v));
  document.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>fcPick("m",+b.dataset.m));
  document.querySelectorAll("[data-l]").forEach(b=>b.onclick=()=>fcPick("l",+b.dataset.l));
  document.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{T.ans[T.i]=+b.dataset.o;q()});
  const p=$("#prev");if(p)p.onclick=()=>{if(T.i>0){T.i--;q()}};
  $("#nx").onclick=()=>next();
}
function toast(msg){const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2500)}
function peek(){if(!T.shown[T.i]){T.shown[T.i]=1;T.peeks++}q()}
function answer(id,v){
  T.ans[id]=v;T.times[id]=(Date.now()-T.itemStart)/1000;
  document.querySelectorAll(".bub").forEach(b=>b.setAttribute("aria-pressed",+b.dataset.v===v));
  setTimeout(()=>{if(T&&T.items[T.i]&&T.items[T.i].id===id)next()},180);
}
function fcPick(kind,x){const a=T.ans[T.i]||{};a[kind]=x;const o=kind==="m"?"l":"m";if(a[o]===x)a[o]=null;T.ans[T.i]=a;q()}
function next(){
  if(!T)return;
  if(T.i<T.items.length-1){T.i++;const f=T.i/T.items.length;[0.25,0.5,0.8].forEach((m,j)=>{if(f>=m&&!T.cheered[j]&&T.items.length>=20){T.cheered[j]=1;toast(U.cheer[j])}});q()}
  else finish();
}
document.addEventListener("keydown",e=>{
  if(!T||e.metaKey||e.ctrlKey||e.altKey)return;
  const k=T.def.kind,key=e.key.toLowerCase();
  if(key==="h"&&S.mode==="exam"){peek();return}
  if(k==="likert"&&/^[1-6]$/.test(key)){answer(T.items[T.i].id,+key);return}
  if(k==="yesno"&&(key==="y"||key==="n")){answer(T.items[T.i].id,key==="y"?1:0);return}
  if(k==="sjt"&&key.length===1&&"abcd".includes(key)){T.ans[T.i]="abcd".indexOf(key);q();return}
  if(key==="arrowright"){const b=$("#nx");if(b&&!b.disabled)b.click()}
  if(key==="arrowleft"){const b=$("#prev");if(b&&!b.disabled)b.click()}
});

/* ---------- results ---------- */
const keyed=(it,v)=>v==null?null:(it.rev?7-v:v);
function fmtA(k,v){if(v==null)return U.blank;return k==="yesno"?(v?UI.ko.yes+" ("+U.yes+")":UI.ko.no_+" ("+U.no_+")"):v+" · "+U.likert[v-1]}
const pillH=(cls,txt)=>`<span class="pill ${cls}">${esc(txt)}</span>`;
function finish(){
  clearInterval(timerId);const R=T;T=null;document.body.classList.remove("testing");
  const k=R.def.kind;const el=Math.round((Date.now()-R.t0)/1000);
  let ringVal=null,ringLbl="",body="";let hC=null,hF=null,hX=null;const fb=[];
  if(k==="likert"||k==="yesno"){
    const items=R.items,n=items.length;
    const val=it=>{const v=R.ans[it.id];if(v==null)return null;return k==="yesno"?(v?6:1):v};
    const answered=items.filter(it=>R.ans[it.id]!=null).length;
    const tr={};items.filter(it=>!it.lie).forEach(it=>{const v=keyed(it,val(it));if(v!=null)(tr[it.trait]=tr[it.trait]||[]).push(v)});
    const fac={};items.filter(it=>!it.lie).forEach(it=>(fac[it.f]=fac[it.f]||[]).push(it));
    let ok=0,tot=0;const bad=[];
    Object.values(fac).forEach(g=>{for(let a=0;a<g.length;a++)for(let b=a+1;b<g.length;b++){const va=keyed(g[a],val(g[a])),vb=keyed(g[b],val(g[b]));if(va==null||vb==null)continue;tot++;if(Math.abs(va-vb)<=(k==="yesno"?0:2))ok++;else bad.push([g[a],g[b],Math.abs(va-vb)])}});
    const cons=tot?Math.round(ok/tot*100):null;hC=cons;ringVal=cons;ringLbl=U.consistency.replace(/\s*[（(].*[)）]/,"");
    const lies=items.filter(it=>it.lie&&R.ans[it.id]!=null);
    const lieHits=lies.filter(it=>k==="yesno"?R.ans[it.id]===1:R.ans[it.id]>=5);hF=lieHits.length;
    const ext=k==="likert"?items.filter(it=>R.ans[it.id]===1||R.ans[it.id]===6).length:null;
    const extPct=k==="likert"&&answered?Math.round(ext/answered*100):null;hX=extPct;
    const ts=Object.values(R.times);const avg=ts.length?ts.reduce((a,b)=>a+b,0)/ts.length:0;
    const cp=cons==null?"":cons>=80?pillH("good",U.good):cons>=65?pillH("warn",U.check):pillH("bad",U.risk);
    const lp=!lies.length?"":lieHits.length<=1?pillH("good",U.natural):lieHits.length<=3?pillH("warn",U.check):pillH("bad",U.faking);
    const ep=extPct==null?"":extPct<5?pillH("warn",U.too_cautious):extPct<=40?pillH("good",U.balanced):extPct<=60?pillH("warn",U.high):pillH("bad",U.very_high);
    const ap=avg<=9?pillH("good",U.on_pace):avg<=13?pillH("warn",U.slow):pillH("bad",U.too_slow);
    body+=`<div class="stats">
      <div class="stat"><b>${answered}/${n}</b><span>${esc(U.answered)}</span><br>${answered===n?pillH("good",U.complete):pillH("bad",U.blanks)}</div>
      <div class="stat"><b>${cons==null?"–":cons+"%"}</b><span>${esc(fmt(U.consistency,tot))}</span><br>${cp}</div>
      <div class="stat"><b>${lieHits.length}/${lies.length}</b><span>${esc(U.too_perfect)}</span><br>${lp}</div>
      ${k==="likert"?`<div class="stat"><b>${extPct}%</b><span>${esc(U.extreme)}</span><br>${ep}</div>`:""}
      <div class="stat"><b>${avg.toFixed(1)}s</b><span>${esc(U.avg)}</span><br>${ap}</div></div>`;
    const prof=TKEYS.filter(t=>tr[t]).map(t=>{const m=tr[t].reduce((a,b)=>a+b,0)/tr[t].length;return [t,Math.round((m-1)/5*100)]});
    body+=`<section class="block"><div class="sec-head"><h2>${esc(U.profile)}</h2></div><div class="panel traits">`+prof.map(([t,p])=>`<div class="tr"><span>${esc(U.traits[t])}${LANG!=="ko"?` <span class="muted" style="font-size:12px">${esc(TRAITS[t].ko)}</span>`:""}</span><span class="track"><i style="width:${p}%"></i></span><span class="v">${p}</span></div>`).join("")+`</div></section>`;
    if(answered<n)fb.push(["bad",fmt(U.fb_blank,n-answered)]);
    if(cons!=null&&cons<80)fb.push([cons<65?"bad":"warn",U.fb_cons]);
    if(lieHits.length>=2)fb.push([lieHits.length>3?"bad":"warn",fmt(U.fb_lie,lieHits.length)]);
    if(extPct!=null&&extPct>40)fb.push(["warn",fmt(U.fb_ext_hi,extPct)]);
    if(extPct!=null&&extPct<5)fb.push(["warn",fmt(U.fb_ext_lo,extPct)]);
    if(prof.length>2){const sp=Math.max(...prof.map(p=>p[1]))-Math.min(...prof.map(p=>p[1]));if(sp<12)fb.push(["warn",fmt(U.fb_flat,sp)])}
    if(avg>9)fb.push(["warn",fmt(U.fb_slow,avg.toFixed(1))]);
    if(R.peeks)fb.push(["warn",fmt(U.fb_peek,R.peeks)]);
    if(!fb.length)fb.push(["good",U.fb_great]);
    body+=`<section class="block fb">${fb.map(f=>`<div class="${f[0]}">${esc(f[1])}</div>`).join("")}</section>`;
    if(bad.length)body+=`<section class="block review"><div class="sec-head"><h2>${esc(fmt(U.incons,bad.length))}</h2></div>${bad.slice(0,12).map(([a,b,d])=>`<details><summary>${esc(a.ko)}</summary><div class="ans">${esc(trItem(a))} → <b class="mono">${esc(fmtA(k,R.ans[a.id]))}</b><br>${esc(b.ko)} (${esc(trItem(b))}) → <b class="mono">${esc(fmtA(k,R.ans[b.id]))}</b><p class="muted" style="margin:6px 0 0">${esc(a.rev!==b.rev?U.inc_opp:(a.rev?U.inc_neg:U.inc_pos))} ${esc(fmt(U.inc_diff,d))} ${esc(U.inc_tip)}</p></div></details>`).join("")}</section>`;
    if(lieHits.length)body+=`<section class="block review"><div class="sec-head"><h2>${esc(U.tp_title)}</h2></div>${lieHits.map(it=>`<details><summary>${esc(it.ko)}</summary><div class="ans">${esc(trItem(it))} → <b class="mono">${esc(fmtA(k,R.ans[it.id]))}</b>. ${esc(U.tp_tip)}</div></details>`).join("")}</section>`;
  } else if(k==="forced"){
    const sc={};let done=0;
    R.items.forEach((blk,i)=>{const a=R.ans[i];if(!a||a.m==null||a.l==null)return;done++;sc[blk[a.m].trait]=(sc[blk[a.m].trait]||0)+2;sc[blk[a.l].trait]=(sc[blk[a.l].trait]||0)-1});
    const vals=TKEYS.map(t=>sc[t]||0);const mx=Math.max(1,...vals.map(Math.abs));
    ringVal=Math.round(done/R.items.length*100);ringLbl=U.blocks_ans;
    body+=`<div class="stats"><div class="stat"><b>${done}/${R.items.length}</b><span>${esc(U.blocks_ans)}</span></div><div class="stat"><b>${Math.floor(el/Math.max(1,done))}s</b><span>${esc(U.avg_block)}</span></div></div>
    <section class="block"><div class="sec-head"><h2>${esc(U.fc_title)}</h2></div><div class="panel traits">${TKEYS.map((t,x)=>{const p=Math.round((vals[x]+mx)/(2*mx)*100);return `<div class="tr"><span>${esc(U.traits[t])}</span><span class="track"><i style="width:${p}%"></i></span><span class="v">${vals[x]>0?"+":""}${vals[x]}</span></div>`}).join("")}</div></section>
    <section class="block fb"><div>${esc(U.fc_note)}</div>${done<R.items.length?`<div class="bad">${esc(fmt(U.fc_unans,R.items.length-done))}</div>`:""}</section>`;
  } else {
    let pts=0,done=0;const pv={best:3,ok:2,bad:1,worst:0};
    R.items.forEach((s,i)=>{const a=R.ans[i];if(a==null)return;done++;pts+=pv[s.o[a][2]]});
    const pct=Math.round(pts/(R.items.length*3)*100);hC=pct;ringVal=pct;ringLbl=U.sjt_score;
    const lab={best:["best",U.best],ok:["ok",U.ok],bad:["bad",U.weak],worst:["bad",U.worst]};
    body+=`<div class="stats"><div class="stat"><b>${pct}%</b><span>${esc(U.sjt_score)}</span><br>${pct>=80?pillH("good",U.strong):pct>=60?pillH("warn",U.fair):pillH("bad",U.review)}</div><div class="stat"><b>${done}/${R.items.length}</b><span>${esc(U.answered)}</span></div></div>
    <section class="block review"><div class="sec-head"><h2>${esc(U.sjt_review)}</h2></div>${R.items.map((s,i)=>{const a=R.ans[i];const tr=trSjt(s);
      return `<details ${a!=null&&s.o[a][2]!=="best"?"open":""}><summary>${i+1}. ${esc(s.ko)}</summary><div class="ans"><p class="muted" style="margin:4px 0">${esc(tr.q)}</p>
      ${s.o.map((o,x)=>`<div style="margin:4px 0">${"ABCD"[x]}. ${esc(o[0])} <span class="muted">${esc(tr.o[x])}</span><span class="tag ${lab[o[2]][0]}">${esc(lab[o[2]][1])}</span>${a===x?` <b>← ${esc(U.your)}</b>`:""}</div>`).join("")}
      <p style="margin:8px 0 0">${esc(tr.why)}</p></div></details>`}).join("")}</section>`;
  }
  const ringColor=ringVal==null?"var(--faint)":ringVal>=80?"var(--mint)":ringVal>=65?"var(--sun)":"var(--coral)";
  $("#app").innerHTML=`<div class="res-hero"><div class="big-ring" style="--p:${ringVal||0};--c:${ringColor}"><div><span><b>${ringVal==null?"–":ringVal+"%"}</b><small>${esc(ringLbl)}</small></span></div></div>
    <div><span class="eyebrow">${esc(U.results)}</span><h1 style="margin-top:8px">${esc(tName(R.def))}</h1>
    <p class="muted" style="margin:6px 0 0">${esc(U.time_used)} <span class="mono">${Math.floor(el/60)}:${String(el%60).padStart(2,"0")}</span>${R.peeks?` · ${esc(U.peeks)} <span class="mono">${R.peeks}</span>`:""}</p></div></div>
    ${body}
    <div class="nav" style="margin-top:28px"><button class="btn ghost" id="home">← ${esc(U.all_tests)}</button><button class="btn" id="again">${esc(U.again)}</button></div>`;
  $("#home").onclick=()=>home();$("#again").onclick=()=>start(R.def.id);
  const h=hist();const d=new Date();
  h.push({id:R.def.id,d:`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,t:tName(R.def),c:hC,f:hF,x:hX});store("ip_hist",h.slice(-60));
  window.scrollTo(0,0);
}
home(true);
