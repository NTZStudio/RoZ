(function(){
function buildArc(wps){
  const pts=[]; let cum=0;
  for(let i=0;i<wps.length;i++){
    if(i>0){const dx=wps[i][0]-wps[i-1][0],dy=wps[i][1]-wps[i-1][1];cum+=Math.hypot(dx,dy);}
    pts.push({x:wps[i][0],y:wps[i][1],d:cum});
  }
  return {pts,total:cum};
}
function ptAt(pts,total,d){
  const dc=Math.max(0,Math.min(total,d));
  if(dc<=0) return {x:pts[0].x,y:pts[0].y};
  if(dc>=total) return {x:pts[pts.length-1].x,y:pts[pts.length-1].y};
  for(let i=1;i<pts.length;i++){
    if(pts[i].d>=dc){
      const seg=pts[i].d-pts[i-1].d;
      const t=seg===0?0:(dc-pts[i-1].d)/seg;
      return {x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,y:pts[i-1].y+(pts[i].y-pts[i-1].y)*t};
    }
  }
  return {x:pts[pts.length-1].x,y:pts[pts.length-1].y};
}
function segD(pts,total,ds,de){
  const a=Math.max(0,Math.min(total,ds));
  const b=Math.max(0,Math.min(total,de));
  if(b<=a) return '';
  const n=Math.max(2,Math.ceil((b-a)/2));
  let d='';
  for(let i=0;i<=n;i++){
    const p=ptAt(pts,total,a+(b-a)*(i/n));
    d+=(i===0?`M ${p.x.toFixed(1)},${p.y.toFixed(1)}`:`L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)+' ';
  }
  return d;
}
function lerp(a,b,t){return a+(b-a)*t;}
function easeIn(t){return t*t*t;}
function easeOutBack(t){
  const c1=2.5,c3=c1+1;
  return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
}
function easeSnake(t){
  const split=0.55;
  if(t<=split) return easeIn(t/split)*split;
  return split+easeOutBack((t-split)/(1-split))*(1-split);
}
function easeInOut(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}

const TAIL_OUT={n:[160,-600],t:[310,900],z:[1400,210]};
const TAIL_IN ={n:[160,-20],t:[310,280],z:[760,210]};
const TAIL_HOVER={n:[160,  50],t:[310,210],z:[ 630,210]};
const WPS_N=[[160,50],[160,210],[30,50],[30,210]];
const WPS_T=[[310,210],[310,70]];
const WPS_Z=[[630,210],[440,210],[630,70],[440,70],[220,70],[400,70]];

function buildPath(tailPt,wps){return buildArc([tailPt,...wps]);}

let PATH_N=buildPath(TAIL_OUT.n,WPS_N);
let PATH_T=buildPath(TAIL_OUT.t,WPS_T);
let PATH_Z=buildPath(TAIL_OUT.z,WPS_Z);

const DUR=2400, DUR_EXIT=2000;
const elN=document.getElementById('sk_n');
const elT=document.getElementById('sk_t');
const elZ=document.getElementById('sk_z');
const trN=document.getElementById('tr_n');
const trT=document.getElementById('tr_t');
const trZ=document.getElementById('tr_z');
if(!elN||!elT||!elZ||!trN||!trT||!trZ) return; // widget không có trên trang này

const SNAKE_LEN=120;

const SERIFS={
  ns1:{el:'ns1',x1:160,y1:50, x2:160,y2:-20},
  ns2:{el:'ns2',x1:160,y1:210,x2:160,y2:270},
  ns3:{el:'ns3',x1:30, y1:50, x2:30, y2:-20},
  ns4:{el:'ns4',x1:30, y1:210,x2:30, y2:270},
  ts1:{el:'ts1',x1:220,y1:70, x2:150,y2:70},
  ts2:{el:'ts2',x1:400,y1:70, x2:470,y2:70},
  ts3:{el:'ts3',x1:310,y1:210,x2:310,y2:280},
  zs1:{el:'zs1',x1:630,y1:210,x2:700,y2:210},
};

function animSerif(id,delay){
  const s=SERIFS[id];
  const el=document.getElementById(s.el);
  const dur=320; let t0=null;
  function go(now){
    if(!t0) t0=now;
    const p=easeInOut(Math.min((now-t0)/dur,1));
    el.setAttribute('x1',s.x1);el.setAttribute('y1',s.y1);
    el.setAttribute('x2',lerp(s.x1,s.x2,p));
    el.setAttribute('y2',lerp(s.y1,s.y2,p));
    if(p<1) requestAnimationFrame(go);
  }
  setTimeout(()=>requestAnimationFrame(go),delay);
}
function retractSerif(id,delay){
  const s=SERIFS[id];
  const el=document.getElementById(s.el);
  const cx2=parseFloat(el.getAttribute('x2')||s.x1);
  const cy2=parseFloat(el.getAttribute('y2')||s.y1);
  const dur=200; let t0=null;
  function go(now){
    if(!t0) t0=now;
    const p=easeInOut(Math.min((now-t0)/dur,1));
    el.setAttribute('x2',lerp(cx2,s.x1,p));
    el.setAttribute('y2',lerp(cy2,s.y1,p));
    if(p<1) requestAnimationFrame(go);
  }
  setTimeout(()=>requestAnimationFrame(go),delay);
}
function resetSerifs(){
  Object.values(SERIFS).forEach(s=>{
    const el=document.getElementById(s.el);
    el.setAttribute('x1',s.x1);el.setAttribute('y1',s.y1);
    el.setAttribute('x2',s.x1);el.setAttribute('y2',s.y1);
  });
}
function animate(path,el,elTrace,p,easeFn){
  const total=path.total;
  const ep=easeFn(p);
  const journey=total+SNAKE_LEN;
  const head=ep*journey-SNAKE_LEN;
  const tail=head-SNAKE_LEN;
  const traceEnd=Math.max(0,Math.min(total,tail));
  elTrace.setAttribute('d',traceEnd>0?segD(path.pts,total,0,traceEnd):'');
  const sTail=Math.max(0,Math.min(total,tail));
  if(head<=0){el.setAttribute('d','');return;}
  if(head<=total){
    el.setAttribute('d',segD(path.pts,total,sTail,head));
  } else {
    const overshoot=head-total;
    const last=path.pts[path.pts.length-1];
    const prev=path.pts[path.pts.length-2];
    const dx=last.x-prev.x,dy=last.y-prev.y;
    const len=Math.hypot(dx,dy)||1;
    const ex=last.x+(dx/len)*overshoot;
    const ey=last.y+(dy/len)*overshoot;
    el.setAttribute('d',segD(path.pts,total,sTail,total)+` L ${ex.toFixed(1)},${ey.toFixed(1)}`);
  }
}

const HOVER_DUR=450;
let hoverRaf=null,hoverT0=null,hoverP=1,animDone=false;
let headStretch=0;
const HEAD_STRETCH_MAX=80;
const HEAD_DIR={
  n:[30,210,0,1],
  t:null,
  z:[400,70,-1,0],
};
function buildPathWithHead(tailPt,wps,headEx){
  if(headEx) return buildArc([tailPt,...wps,headEx]);
  return buildArc([tailPt,...wps]);
}
function getHeadExt(key,stretch){
  if(stretch<=0) return null;
  const d=HEAD_DIR[key];
  if(!d) return null;
  return [d[0]+d[2]*stretch,d[1]+d[3]*stretch];
}
function rebuildPaths(){
  const hs=headStretch;
  PATH_N=buildPathWithHead([lerp(TAIL_IN.n[0],TAIL_HOVER.n[0],1-hoverP),lerp(TAIL_IN.n[1],TAIL_HOVER.n[1],1-hoverP)],WPS_N,getHeadExt('n',hs));
  PATH_T=buildPathWithHead([lerp(TAIL_IN.t[0],TAIL_HOVER.t[0],1-hoverP),lerp(TAIL_IN.t[1],TAIL_HOVER.t[1],1-hoverP)],WPS_T,getHeadExt('t',hs));
  PATH_Z=buildPathWithHead([lerp(TAIL_IN.z[0],TAIL_HOVER.z[0],1-hoverP),lerp(TAIL_IN.z[1],TAIL_HOVER.z[1],1-hoverP)],WPS_Z,getHeadExt('z',hs));
}
function redrawTraces(){
  trN.setAttribute('d',segD(PATH_N.pts,PATH_N.total,0,PATH_N.total));
  trT.setAttribute('d',segD(PATH_T.pts,PATH_T.total,0,PATH_T.total));
  trZ.setAttribute('d',segD(PATH_Z.pts,PATH_Z.total,0,PATH_Z.total));
}
function animHover(dir){
  if(state!=='in') return;
  if(hoverRaf) cancelAnimationFrame(hoverRaf);
  const startTail=hoverP,endTail=dir===-1?0:1;
  const startHead=headStretch,endHead=dir===-1?HEAD_STRETCH_MAX:0;
  hoverT0=null;
  function hframe(now){
    if(!hoverT0) hoverT0=now;
    const p=easeInOut(Math.min((now-hoverT0)/HOVER_DUR,1));
    hoverP=lerp(startTail,endTail,p);
    headStretch=lerp(startHead,endHead,p);
    rebuildPaths();
    redrawTraces();
    if(p<1) hoverRaf=requestAnimationFrame(hframe);
    else hoverRaf=null;
  }
  hoverRaf=requestAnimationFrame(hframe);
}

let rafId=null,t0=null;
let state='idle';
function run(){
  if(state==='entering'||state==='exiting') return;
  state='entering';
  animDone=false;
  if(hoverRaf){cancelAnimationFrame(hoverRaf);hoverRaf=null;}
  headStretch=0;
  PATH_N=buildPath(TAIL_OUT.n,WPS_N);
  PATH_T=buildPath(TAIL_OUT.t,WPS_T);
  PATH_Z=buildPath(TAIL_OUT.z,WPS_Z);
  hoverP=1;
  if(rafId) cancelAnimationFrame(rafId);
  elN.setAttribute('d','');elT.setAttribute('d','');elZ.setAttribute('d','');
  trN.setAttribute('d','');trT.setAttribute('d','');trZ.setAttribute('d','');
  resetSerifs();t0=null;
  function frame(now){
    if(t0===null) t0=now;
    const raw=Math.min((now-t0)/DUR,1);
    animate(PATH_Z,elZ,trZ,raw,easeInOut);
    animate(PATH_T,elT,trT,raw,easeInOut);
    animate(PATH_N,elN,trN,raw,easeSnake);
    if(raw<1){
      rafId=requestAnimationFrame(frame);
    } else {
      elN.setAttribute('d','');elT.setAttribute('d','');elZ.setAttribute('d','');
      trN.setAttribute('d',segD(PATH_N.pts,PATH_N.total,0,PATH_N.total));
      trT.setAttribute('d',segD(PATH_T.pts,PATH_T.total,0,PATH_T.total));
      trZ.setAttribute('d',segD(PATH_Z.pts,PATH_Z.total,0,PATH_Z.total));
      ['ns1','ns2','ns3','ns4'].forEach((id,i)=>animSerif(id,i*60));
      ['ts1','ts2','ts3'].forEach((id,i)=>animSerif(id,i*60));
      ['zs1'].forEach((id,i)=>animSerif(id,i*60));

      const RETRACT_DUR=700; let rT0=null;
      state='retracting';
      function retractTail(now){
        if(!rT0) rT0=now;
        const p=easeInOut(Math.min((now-rT0)/RETRACT_DUR,1));
        PATH_N=buildArc([[lerp(TAIL_OUT.n[0],TAIL_IN.n[0],p),lerp(TAIL_OUT.n[1],TAIL_IN.n[1],p)],...WPS_N]);
        PATH_T=buildArc([[lerp(TAIL_OUT.t[0],TAIL_IN.t[0],p),lerp(TAIL_OUT.t[1],TAIL_IN.t[1],p)],...WPS_T]);
        PATH_Z=buildArc([[lerp(TAIL_OUT.z[0],TAIL_IN.z[0],p),lerp(TAIL_OUT.z[1],TAIL_IN.z[1],p)],...WPS_Z]);
        trN.setAttribute('d',segD(PATH_N.pts,PATH_N.total,0,PATH_N.total));
        trT.setAttribute('d',segD(PATH_T.pts,PATH_T.total,0,PATH_T.total));
        trZ.setAttribute('d',segD(PATH_Z.pts,PATH_Z.total,0,PATH_Z.total));
        if(p<1){
          rafId=requestAnimationFrame(retractTail);
        } else {
          rafId=null; hoverP=1;
          rebuildPaths(); redrawTraces();
          animDone=true; state='in';
          if(isMouseOver) animHover(-1);
        }
      }
      rafId=requestAnimationFrame(retractTail);
    }
  }
  rafId=requestAnimationFrame(frame);
}
function runExit(){
  if(state!=='in') return;
  state='exiting';animDone=false;
  if(hoverRaf){cancelAnimationFrame(hoverRaf);hoverRaf=null;}
  Object.keys(SERIFS).forEach((id,i)=>retractSerif(id,i*30));
  const startTail=hoverP,startHead=headStretch;
  const PRE_DUR=400;let preT0=null;
  function preTween(now){
    if(!preT0) preT0=now;
    const p=easeInOut(Math.min((now-preT0)/PRE_DUR,1));
    hoverP=lerp(startTail,0,p);
    headStretch=lerp(startHead,HEAD_STRETCH_MAX,p);
    rebuildPaths();redrawTraces();
    if(p<1){requestAnimationFrame(preTween);return;}
    startExitAnim();
  }
  requestAnimationFrame(preTween);
}
function startExitAnim(){
  const EXIT_PATH_N=buildArc([...WPS_N,[30,900]]);
  const EXIT_PATH_T=buildArc([...WPS_T,[310,-600]]);
  const EXIT_PATH_Z=buildArc([...WPS_Z,[-700,70]]);
  trN.setAttribute('d',segD(buildArc(WPS_N).pts,buildArc(WPS_N).total,0,buildArc(WPS_N).total));
  trT.setAttribute('d',segD(buildArc(WPS_T).pts,buildArc(WPS_T).total,0,buildArc(WPS_T).total));
  trZ.setAttribute('d',segD(buildArc(WPS_Z).pts,buildArc(WPS_Z).total,0,buildArc(WPS_Z).total));
  elN.setAttribute('d','');elT.setAttribute('d','');elZ.setAttribute('d','');
  let t0e=null;
  if(rafId) cancelAnimationFrame(rafId);
  function frame(now){
    if(t0e===null) t0e=now;
    const raw=Math.min((now-t0e)/DUR_EXIT,1);
    const ep=easeInOut(raw);
    drawConveyorSnake(EXIT_PATH_N,elN,trN,ep);
    drawConveyorSnake(EXIT_PATH_T,elT,trT,ep);
    drawConveyorSnake(EXIT_PATH_Z,elZ,trZ,ep);
    if(raw<1){
      rafId=requestAnimationFrame(frame);
    } else {
      rafId=null;state='out';
      elN.setAttribute('d','');elT.setAttribute('d','');elZ.setAttribute('d','');
      trN.setAttribute('d','');trT.setAttribute('d','');trZ.setAttribute('d','');
      resetSerifs();headStretch=0;hoverP=1;
    }
  }
  rafId=requestAnimationFrame(frame);
}
function drawConveyorSnake(exitPath,elSnake,elTrace,ep){
  const total=exitPath.total;
  const snakeLen=SNAKE_LEN+(SNAKE_LEN*3)*ep;
  const journey=total+snakeLen;
  const head=ep*journey;
  const tail=head-snakeLen;
  const pts=exitPath.pts;
  const lastSeg=Math.hypot(pts[pts.length-1].x-pts[pts.length-2].x,pts[pts.length-1].y-pts[pts.length-2].y);
  const letterEnd=total-lastSeg;
  const traceStart=Math.max(0,Math.min(letterEnd,tail));
  if(traceStart<letterEnd){
    elTrace.setAttribute('d',segD(pts,total,traceStart,letterEnd));
  } else {
    elTrace.setAttribute('d','');
  }
  if(head<=0){elSnake.setAttribute('d','');return;}
  const sTail=Math.max(0,Math.min(total,tail));
  if(head<=total){
    elSnake.setAttribute('d',segD(pts,total,sTail,head));
  } else {
    const overshoot=head-total;
    const last=pts[pts.length-1];
    const prev=pts[pts.length-2];
    const dx=last.x-prev.x,dy=last.y-prev.y;
    const len=Math.hypot(dx,dy)||1;
    const ex=last.x+(dx/len)*overshoot;
    const ey=last.y+(dy/len)*overshoot;
    elSnake.setAttribute('d',segD(pts,total,sTail,total)+` L ${ex.toFixed(1)},${ey.toFixed(1)}`);
  }
}

const wrapEl=document.getElementById('hoverZone');
let isMouseOver=false;
if(wrapEl){
  wrapEl.addEventListener('mouseenter',()=>{ isMouseOver=true;  if(state==='in'&&animDone) animHover(-1); });
  wrapEl.addEventListener('mouseleave',()=>{ isMouseOver=false; if(state==='in'&&animDone) animHover(1);  });
}

const svgEl=document.getElementById('svg');
if(svgEl){
  svgEl.style.cursor='pointer';
  svgEl.addEventListener('click',(e)=>{
    e.stopPropagation();
    if(state==='in'){
      runExit();
      const waitExit=setInterval(()=>{
        if(state==='out'){ clearInterval(waitExit); setTimeout(()=>run(),200); }
      },100);
    }
  });
}

function checkNTZVisibility(){
  const svgRect=svgEl.getBoundingClientRect();
  const ntzVisible=svgRect.bottom > 0 && svgRect.top < window.innerHeight;
  if(!ntzVisible && state==='in') runExit();
  if(ntzVisible && state==='out') run();
}
window.addEventListener('scroll', checkNTZVisibility, { passive:true });
setInterval(checkNTZVisibility, 200);

setTimeout(()=>{run();},400);
})();
