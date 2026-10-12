(function(){
"use strict";
const $=s=>document.querySelector(s);
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
const ease=t=>1-Math.pow(1-t,3);
const phase=(g,a,b)=>ease(clamp((g-a)/(b-a)));
const REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function hex(c){c=c.replace('#','');return[parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)];}
function mix(a,b,t){t=clamp(t);const A=hex(a),B=hex(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');}
function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

/* ---------- drawing primitives ---------- */
function stem(c,x0,y0,x1,y1,bend,w,col){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo((x0+x1)/2+bend,(y0+y1)/2,x1,y1);c.stroke();}
function leaf(c,x,y,len,wid,ang,col){if(len<.6)return;c.save();c.translate(x,y);c.rotate(ang);c.fillStyle=col;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(len*.3,-wid,len*.75,-wid*.8,len,0);c.bezierCurveTo(len*.75,wid*.8,len*.3,wid,0,0);c.fill();c.restore();}
function dot(c,x,y,r,col){if(r<=.2)return;c.fillStyle=col;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
function oval(c,x,y,rx,ry,rot,col){if(rx<=.2||ry<=.2)return;c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fill();}
function qpt(x0,y0,cx,cy,x1,y1,t){const u=1-t;return[u*u*x0+2*u*t*cx+t*t*x1,u*u*y0+2*u*t*cy+t*t*y1];}

function seedling(c,s,k,P){
  oval(c,0,-s*.012,s*.04,s*.018,0,'#7a5236');
  const g=phase(k,.25,1);if(g<=0){oval(c,0,-s*.02,s*.018,s*.012,-.3,'#c8a26a');return;}
  const h=s*.1*g;stem(c,0,-s*.01,0,-h,s*.01,Math.max(1,s*.014),P.stem);
  leaf(c,0,-h,s*.07*g,s*.035*g,-2.5,P.leaf);leaf(c,0,-h,s*.07*g,s*.035*g,-.64,P.leaf2);
}
function sparkles(c,s,t){
  for(let i=0;i<4;i++){const a=t*.6+i*TAU/4,r=s*(.42+.08*Math.sin(t*1.7+i));const x=Math.cos(a)*r,y=-s*.55+Math.sin(a)*r*.6;const k=s*.03*(.6+.4*Math.sin(t*3+i*2));
    c.fillStyle='rgba(255,220,110,.9)';c.beginPath();c.moveTo(x,y-k);c.quadraticCurveTo(x,y,x+k,y);c.quadraticCurveTo(x,y,x,y+k);c.quadraticCurveTo(x,y,x-k,y);c.quadraticCurveTo(x,y,x,y-k);c.fill();}
}

/* ---------- species ---------- */
function daisyHead(c,x,y,s,k,P,grow){
  if(grow<.3)return;
  if(k<.03){dot(c,x,y,s*.03,P.leaf2);return;}
  c.save();c.translate(x,y);const n=16;
  for(let i=0;i<n;i++){c.save();c.rotate(i*TAU/n+.1);oval(c,s*.07*k,0,s*.066*k,s*.019*(.6+.4*k),0,i%2?P.flower:P.flower2);c.restore();}
  dot(c,0,0,s*.044*(.5+.5*k),P.center);dot(c,-s*.012,-s*.012,s*.014*k,'#f7d36a');c.restore();
}
function dDaisy(c,s,g,t,P){
  const sp=phase(g,0,.65),lp=phase(g,0,.5),bp=phase(g,.62,1),sw=Math.sin(t*1.2)*s*.03*sp;
  [[-2.75,.24,P.leaf],[-.4,.23,P.leaf2],[-2.3,.18,P.leaf2],[-.85,.17,P.leaf]].forEach(([a,l,col])=>leaf(c,0,0,s*l*lp,s*.075*lp,a,col));
  const k2=phase(g,.25,.8);
  if(k2>0){const x=-s*.2*k2+sw*.7,y=-s*.5*k2;stem(c,0,0,x,y,-s*.05,Math.max(1,s*.02),P.stem);daisyHead(c,x,y,s*.8,phase(g,.75,1),P,k2);}
  const h=s*.8*sp;stem(c,0,0,sw,-h,s*.06,Math.max(1.2,s*.025),P.stem);
  leaf(c,sw*.4,-h*.45,s*.11*lp,s*.035*lp,-.5,P.leaf);
  daisyHead(c,sw,-h,s,bp,P,sp);
}
function trefoil(c,x,y,r,col){if(r<.6)return;[-Math.PI/2,-Math.PI/2+2.1,-Math.PI/2-2.1].forEach(a=>{oval(c,x+Math.cos(a)*r*.72,y+Math.sin(a)*r*.58,r*.6,r*.5,a,col);});c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=Math.max(.6,r*.09);c.beginPath();c.arc(x,y,r*.45,0,TAU);c.stroke();}
function dClover(c,s,g,t,P){
  const lp=phase(g,0,.7),bp=phase(g,.6,1);
  [[-.17,.28],[.16,.32],[-.04,.42],[.25,.2],[-.27,.18]].forEach(([dx,h],i)=>{const sw=Math.sin(t*1.3+i)*s*.015;const x=dx*s*lp+sw,y=-h*s*lp;stem(c,0,0,x,y,dx*s*.2,Math.max(1,s*.014),P.stem);trefoil(c,x,y,s*.062*lp,i%2?P.leaf2:P.leaf);});
  if(bp>0)[[.07,.56],[-.12,.47]].forEach(([dx,h],i)=>{const x=dx*s+Math.sin(t*1.1+i)*s*.02,y=-h*s*bp;stem(c,0,0,x,y,s*.03,Math.max(1,s*.013),P.stem);const r=s*.065*bp;for(let j=0;j<20;j++){const a=j*2.39996,rr=r*.7*Math.sqrt((j+1)/20);oval(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr*.9,r*.34,r*.2,a,j%3?P.flower:P.flower2);}});
}
function dTulip(c,s,g,t,P){
  const sp=phase(g,0,.6),lp=phase(g,0,.55),bp=phase(g,.6,1),sw=Math.sin(t*1.1)*s*.025*sp;
  leaf(c,0,0,s*.46*lp,s*.09*lp,-1.18,P.leaf);leaf(c,0,0,s*.4*lp,s*.085*lp,-2.0,P.leaf2);
  const h=s*.72*sp;stem(c,0,0,sw,-h,s*.02,Math.max(1.2,s*.026),P.stem);
  if(sp<.25)return;const r=s*.1*(.5+.5*bp);
  const c1=mix(P.leaf,P.flower,bp*1.4),c2=mix(P.leaf2,P.flower2,bp*1.4),op=.22+.28*bp;
  c.save();c.translate(sw,-h+r*.2);leaf(c,0,0,r*1.75,r*.78,-Math.PI/2-op,c2);leaf(c,0,0,r*1.75,r*.78,-Math.PI/2+op,c2);leaf(c,0,0,r*1.9,r*.88,-Math.PI/2,c1);
  if(bp>.5){c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=Math.max(.6,r*.08);c.beginPath();c.moveTo(-r*.15,-r*.3);c.quadraticCurveTo(-r*.25,-r*1,-r*.05,-r*1.5);c.stroke();}
  c.restore();
}
function dLavender(c,s,g,t,P){
  const sp=phase(g,0,.7),bp=phase(g,.55,1),lp=phase(g,0,.5);
  for(let i=0;i<8;i++)leaf(c,0,0,s*.2*lp,s*.026*lp,-Math.PI/2+(i-3.5)*.3,i%2?P.leaf:P.leaf2);
  for(let i=0;i<7;i++){const a=-Math.PI/2+(i-3)*.12+Math.sin(t*1.3+i)*.035*sp,L=s*(.6+.14*((i*5)%3)/2)*sp;const ex=Math.cos(a)*L,ey=Math.sin(a)*L;
    c.strokeStyle=P.stem;c.lineWidth=Math.max(1,s*.012);c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(ex,ey);c.stroke();
    if(sp>.35)for(let j=0;j<8;j++){const f=.6+j*.055;const x=Math.cos(a)*L*f,y=Math.sin(a)*L*f;const side=j%2?1:-1;const k=(.55+.45*bp)*(1-j*.05);
      oval(c,x+Math.cos(a+Math.PI/2)*s*.012*side,y,s*.022*k,s*.014*k,a+side*.6,mix(P.leaf,j%2?P.flower:P.flower2,bp));}
  }
}
function dFern(c,s,g,t,P){
  const u=phase(g,0,.85);
  const F=[[-2.55,.48],[-2.2,.62],[-1.85,.72],[-1.3,.72],[-.95,.62],[-.6,.48]];
  F.forEach(([a0,ln],fi)=>{
    const L=s*(.05+ln*u*.95),N=16,seg=L/N,sign=a0<-Math.PI/2?-1:1;let x=0,y=0,a=a0+Math.sin(t*.9+fi)*.03;const pts=[];
    for(let i=0;i<N;i++){a+=sign*(.035+Math.pow(i/N,2)*(.22+2.4*(1-u)));x+=Math.cos(a)*seg;y+=Math.sin(a)*seg;pts.push([x,y,a]);}
    c.strokeStyle=P.stem;c.lineWidth=Math.max(1,s*.012);c.lineCap='round';c.beginPath();c.moveTo(0,0);pts.forEach(p=>c.lineTo(p[0],p[1]));c.stroke();
    for(let i=1;i<N-1;i++){const k=1-i/N,pl=s*.12*k*u*(i<2?.6:1);const[px,py,pa]=pts[i];leaf(c,px,py,pl,pl*.32,pa-1.05*sign,P.leaf);leaf(c,px,py,pl,pl*.32,pa+1.05*sign,P.leaf2);}
    if(u>.85){const[px,py]=pts[N-1];dot(c,px,py,s*.012,P.flower);}
  });
}
function dPoppy(c,s,g,t,P){
  const sp=phase(g,0,.65),bp=phase(g,.65,1),lp=phase(g,0,.5);
  [[-2.6,.2],[-.55,.21],[-2.05,.16],[-1.1,.15]].forEach(([a,l],i)=>{const len=s*l*lp;leaf(c,0,0,len,s*.05*lp,a,i%2?P.leaf2:P.leaf);for(let j=1;j<3;j++){const f=j/3;leaf(c,Math.cos(a)*len*f,Math.sin(a)*len*f,len*.35,s*.02*lp,a+(j%2?.8:-.8),P.leaf);}});
  const h=s*.82*sp,sw=Math.sin(t*1.4)*s*.04*sp;
  c.strokeStyle=P.stem;c.lineWidth=Math.max(1,s*.016);c.lineCap='round';c.beginPath();c.moveTo(0,0);c.bezierCurveTo(s*.08,-h*.35,-s*.06+sw*.5,-h*.7,sw,-h);c.stroke();
  if(sp<.3)return;
  c.save();c.translate(sw,-h);
  if(bp<.05){c.rotate(.95);oval(c,0,s*.035,s*.026,s*.042,0,P.leaf2);c.restore();return;}
  const r=s*.13*bp;
  for(let i=0;i<4;i++){const a=i*TAU/4+.35;oval(c,Math.cos(a)*r*.48,Math.sin(a)*r*.4,r*.64,r*.56,a,i%2?P.flower2:P.flower);}
  for(let i=0;i<4;i+=2){const a=i*TAU/4+.35;oval(c,Math.cos(a)*r*.48,Math.sin(a)*r*.4,r*.64,r*.56,a,P.flower);}
  dot(c,0,0,r*.24,P.center);for(let i=0;i<10;i++){const a=i*TAU/10;dot(c,Math.cos(a)*r*.36,Math.sin(a)*r*.33,r*.045,P.center);}
  dot(c,0,0,r*.1,'#6e8a46');c.restore();
}
function dSunflower(c,s,g,t,P){
  const sp=phase(g,0,.7),lp=phase(g,.1,.7),bp=phase(g,.66,1),h=s*.92*sp,sw=Math.sin(t*.9)*s*.02*sp;
  stem(c,0,0,sw,-h,s*.03,Math.max(1.5,s*.04),P.stem);
  [[.22,1],[.42,-1],[.6,1],[.74,-1]].forEach(([f,side],i)=>{const[x,y]=qpt(0,0,sw/2+s*.03,-h/2,sw,-h,f);leaf(c,x,y,s*.25*lp*(1-i*.12),s*.12*lp*(1-i*.12),side>0?-.25:-2.9,i%2?P.leaf2:P.leaf);});
  if(sp<.35)return;
  const r=s*.1*(.35+.65*bp);c.save();c.translate(sw,-h);
  if(bp<.05){for(let i=0;i<10;i++){c.save();c.rotate(i*TAU/10);oval(c,r*.7,0,r*.45,r*.18,0,P.leaf2);c.restore();}dot(c,0,0,r*.7,P.leaf);c.restore();return;}
  for(let L=0;L<2;L++)for(let i=0;i<22;i++){c.save();c.rotate(i*TAU/22+L*Math.PI/22);oval(c,r*(1.15-L*.1),0,r*(.52-L*.06)*bp+r*.1,r*.17,0,L?P.flower:P.flower2);c.restore();}
  dot(c,0,0,r*.78,P.center);
  const n=Math.round(70*bp);for(let i=0;i<n;i++){const a=i*2.39996,rr=r*.72*Math.sqrt(i/70);dot(c,Math.cos(a)*rr,Math.sin(a)*rr,r*.045,i%3?'#3a2412':'#7a5328');}
  c.restore();
}
function dTomato(c,s,g,t,P){
  const sp=phase(g,0,.7),lp=phase(g,.05,.7),bp=phase(g,.55,1),h=s*.76*Math.max(sp,.05);
  c.strokeStyle='#b8905e';c.lineWidth=Math.max(1.2,s*.018);c.lineCap='round';c.beginPath();c.moveTo(s*.07,s*.01);c.lineTo(s*.07,-s*.82*Math.max(sp,.35));c.stroke();
  const V=[[0,0],[-s*.05,-h*.25],[s*.05,-h*.5],[-s*.04,-h*.75],[s*.02,-h]];const sw=Math.sin(t)*s*.012;
  c.strokeStyle=P.stem;c.lineWidth=Math.max(1.2,s*.022);c.beginPath();c.moveTo(0,0);for(let i=1;i<V.length;i++){const[x0,y0]=V[i-1],[x1,y1]=V[i];c.quadraticCurveTo(x0+sw,y0,(x0+x1)/2+sw,(y0+y1)/2);}c.lineTo(V[4][0]+sw,V[4][1]);c.stroke();
  V.slice(1).forEach(([x,y],i)=>{const side=i%2?1:-1;for(let j=0;j<3;j++)leaf(c,x+sw,y,s*(.15-j*.035)*lp,s*.045*lp,side>0?-.4-j*.5:-2.7+j*.5,j%2?P.leaf2:P.leaf);});
  if(bp>0){const col=mix('#86b956',P.fruit,bp*1.4-.3);[[-.11,.36],[.13,.55],[-.09,.7],[.12,.3]].forEach(([x,y],i)=>{const r=s*.062*(.4+.6*bp)*(i===3?.85:1);const fx=x*s+sw,fy=-y*h;
    stem(c,fx,fy-r*1.3,fx,fy-r*.6,0,Math.max(.8,s*.008),P.stem);dot(c,fx,fy,r,col);dot(c,fx-r*.35,fy-r*.35,r*.22,'rgba(255,255,255,.35)');
    for(let k=0;k<5;k++)leaf(c,fx,fy-r*.85,r*.55,r*.18,-Math.PI/2+(k-2)*.7,P.leaf2);});}
}
function dFir(c,s,g,t,P){
  const k=.3+.7*phase(g,0,.9),bp=phase(g,.7,1);c.save();c.scale(k,k);c.transform(1,0,Math.sin(t*.7)*.015,1,0,0);
  c.fillStyle=P.trunk;c.fillRect(-s*.035,-s*.2,s*.07,s*.2);
  for(let i=0;i<4;i++){const yb=-s*(.13+i*.18),w=s*(.34-i*.065),h=s*(.3-i*.02),z=s*.03;
    c.fillStyle=P.leaf2;c.beginPath();c.moveTo(0,yb-h);c.lineTo(w,yb);for(let q=3;q>=-3;q--)c.lineTo(q/4*w,yb+(q%2===0?z:0));c.lineTo(-w,yb);c.closePath();c.fill();
    c.fillStyle=P.leaf;c.beginPath();c.moveTo(0,yb-h);c.lineTo(-w,yb);for(let q=-3;q<=0;q++)c.lineTo(q/4*w,yb+(q%2===0?z:0));c.closePath();c.fill();
    if(bp>0&&i<3){[-1,1].forEach(sd=>{oval(c,sd*w*.62,yb+s*.035,s*.016*bp,s*.03*bp,0,P.flower);});}
  }
  if(P._rare){const y=-s*(.13+3*.18)-s*.28,r=s*.05;c.fillStyle='#ffd55a';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;c.lineTo(Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();}
  c.restore();
}
function trunk(c,s,h,w,col,branches){
  c.fillStyle=col;c.beginPath();c.moveTo(-w*s,0);c.quadraticCurveTo(-w*s*.35,-h*s*.3,-w*s*.35,-h*s);c.lineTo(w*s*.35,-h*s);c.quadraticCurveTo(w*s*.35,-h*s*.3,w*s,0);c.closePath();c.fill();
  c.strokeStyle=col;c.lineCap='round';branches.forEach(([x0,y0,x1,y1,bw])=>{c.lineWidth=bw*s;c.beginPath();c.moveTo(x0*s,y0*s);c.quadraticCurveTo((x0+x1)/2*s,(y0+y1)/2*s-s*.04,x1*s,y1*s);c.stroke();});
}
function canopy(c,s,blobs,cp,cols,t){
  const sw=Math.sin(t*.8)*s*.012;
  blobs.forEach(([x,y,r])=>dot(c,x*s+r*s*cp*.14+sw,y*s+r*s*cp*.2,r*s*cp,cols[0]));
  blobs.forEach(([x,y,r])=>dot(c,x*s+sw,y*s,r*s*cp,cols[1]));
  blobs.forEach(([x,y,r],i)=>{if(i%2===0)dot(c,x*s-r*s*cp*.38+sw,y*s-r*s*cp*.38,r*s*cp*.28,cols[2]);});
}
const CHB=[[0,-.62,.2],[-.21,-.55,.16],[.21,-.57,.17],[-.1,-.76,.15],[.12,-.77,.15],[-.32,-.45,.11],[.32,-.47,.12],[0,-.88,.11]];
function dCherry(c,s,g,t,P){
  const k=.32+.68*phase(g,0,.85),cp=phase(g,.1,.75),bp=phase(g,.55,1);c.save();c.scale(k,k);
  trunk(c,s,.5,.06,P.trunk,[[0,-.38,-.22,-.58,.022],[0,-.4,.24,-.6,.022],[0,-.48,.02,-.8,.02]]);
  canopy(c,s,CHB,cp,[mix(P.leaf2,P.flower2,bp),mix(P.leaf,P.flower,bp),mix(P.leaf3,'#fbd0dc',bp)],t);
  if(P._anim&&bp>.9&&!REDUCED)for(let i=0;i<7;i++){const ph=(t*.1+i/7)%1;const x=(Math.sin(i*2.3)*.36+Math.sin(t*.9+i)*.05)*s,y=(-.45+ph*.47)*s;oval(c,x,y,s*.015,s*.009,t*1.5+i,P.flower2);}
  c.restore();
}
const OKB=[[0,-.6,.24],[-.27,-.52,.18],[.27,-.53,.19],[-.13,-.79,.18],[.15,-.8,.17],[-.4,-.42,.12],[.4,-.43,.13],[0,-.95,.12]];
function dOak(c,s,g,t,P){
  const k=.3+.7*phase(g,0,.9),cp=phase(g,.08,.75),bp=phase(g,.7,1);c.save();c.scale(k,k);
  trunk(c,s,.5,.09,P.trunk,[[0,-.36,-.27,-.55,.034],[0,-.38,.29,-.56,.034],[0,-.45,-.05,-.82,.03]]);
  canopy(c,s,OKB,cp,[P.leaf2,P.leaf,P.leaf3],t);
  if(bp>0)[[-.2,-.5],[.18,-.62],[.33,-.42],[-.05,-.72],[-.35,-.4],[.05,-.48]].forEach(([x,y])=>{oval(c,x*s,y*s+s*.02,s*.018*bp,s*.024*bp,0,P.flower);oval(c,x*s,y*s,s*.021*bp,s*.012*bp,0,P.trunk);});
  c.restore();
}

const SPECIES=[
  {k:'daisy',n:'Margherita',l:'Bellis perennis',f:1,price:0,min:10,draw:dDaisy,pal:{flower:'#fdfdf8',flower2:'#ebe7dc',center:'#f0b42c'}},
  {k:'clover',n:'Trifoglio',l:'Trifolium repens',f:0,price:0,min:10,draw:dClover,pal:{leaf:'#4f9a46',leaf2:'#3f8139',flower:'#f6eef2',flower2:'#dcaac0'}},
  {k:'tulip',n:'Tulipano',l:'Tulipa gesneriana',f:0,price:20,min:10,draw:dTulip,pal:{leaf:'#6aa65a',leaf2:'#548e48',flower:'#e5483b',flower2:'#b9302a'}},
  {k:'fern',n:'Felce',l:'Dryopteris filix-mas',f:1,price:30,min:10,draw:dFern,pal:{stem:'#4c8a3b',leaf:'#5aa64e',leaf2:'#3f8a3d',flower:'#b4dc7a'}},
  {k:'lavender',n:'Lavanda',l:'Lavandula angustifolia',f:1,price:40,min:10,draw:dLavender,pal:{stem:'#6f8f62',leaf:'#8ba98a',leaf2:'#738f72',flower:'#8b6bd0',flower2:'#6a4fae'}},
  {k:'poppy',n:'Papavero',l:'Papaver rhoeas',f:0,price:50,min:10,draw:dPoppy,pal:{flower:'#e63a2b',flower2:'#c2271f',center:'#1f1a1a'}},
  {k:'tomato',n:'Pomodoro',l:'Solanum lycopersicum',f:0,price:0,min:10,req:'cycle',draw:dTomato,pal:{fruit:'#e0402e'}},
  {k:'sunflower',n:'Girasole',l:'Helianthus annuus',f:0,price:70,min:30,draw:dSunflower,pal:{flower:'#f7c428',flower2:'#e7a213',center:'#5b3a1e',leaf:'#5e9e42',leaf2:'#4c8636'}},
  {k:'fir',n:'Abete',l:'Abies alba',f:0,price:100,min:45,draw:dFir,pal:{leaf:'#3b7d55',leaf2:'#28603f',trunk:'#6b4a32',flower:'#8a5a34'}},
  {k:'cherry',n:'Ciliegio',l:'Prunus avium',f:0,price:140,min:50,draw:dCherry,pal:{leaf:'#6aa653',leaf2:'#4f8a3f',leaf3:'#94c879',flower:'#f7bccb',flower2:'#eb98ae',trunk:'#5e3f30'}},
  {k:'willow',n:'Salice di coppia',l:'Salix babylonica',f:0,price:0,min:10,req:'together',draw:dWillow,pal:{leaf:'#9cc46a',leaf2:'#7fae52',leaf3:'#c2df94',trunk:'#6b5040'}},
  {k:'oak',n:'Quercia',l:'Quercus robur',f:1,price:200,min:60,draw:dOak,pal:{leaf:'#4f8d3e',leaf2:'#3a7031',leaf3:'#6fab50',trunk:'#5b4330',flower:'#a06e35'}},
];
const SP=Object.fromEntries(SPECIES.map(s=>[s.k,s]));
const BASE={stem:'#4f8a3c',leaf:'#5c9d48',leaf2:'#447d36',leaf3:'#7cb85e',flower:'#ffffff',flower2:'#eeeeee',center:'#f2b630',trunk:'#6b4a32',fruit:'#e0402e'};
const DRY={stem:'#8b7a55',leaf:'#a48d5f',leaf2:'#8a7449',leaf3:'#b39d70',flower:'#b9a27c',flower2:'#9c8460',center:'#6b5638',trunk:'#6e5a43',fruit:'#9c7a58'};
const GOLD={flower:'#f6c84a',flower2:'#dca21e',fruit:'#f0b429',center:'#c9781a'};

function drawPlant(c,sp,x,y,s,g,t,o){
  o=o||{};c.save();c.translate(x,y);let P=Object.assign({},BASE,sp.pal);if(!o.dead)seasonPal(sp,P);
  if(REDUCED)t=0;
  if(o.dead){Object.assign(P,DRY);c.transform(1,0,-.16,.86,0,0);}
  else if(o.rare){Object.assign(P,GOLD);if(g>.9){const gr=c.createRadialGradient(0,-s*.55,0,0,-s*.55,s*.62);gr.addColorStop(0,'rgba(255,214,90,.4)');gr.addColorStop(1,'rgba(255,214,90,0)');c.fillStyle=gr;c.fillRect(-s*.7,-s*1.2,s*1.4,s*1.25);}}
  P._anim=!!o.anim;P._rare=!!o.rare&&!o.dead;
  if(g<.1)seedling(c,s,g/.1,P);else sp.draw(c,s,(g-.1)/.9,t,P);
  if(P._rare&&g>.9)sparkles(c,s,t);
  c.restore();
}
function island(c,x,y,rx){
  const ry=rx*.27;c.fillStyle='#6a4a33';c.beginPath();c.ellipse(x,y+ry*.2,rx*.97,ry*2.1,0,0,Math.PI);c.fill();
  c.fillStyle='#57392a';c.beginPath();c.ellipse(x,y+ry*.2,rx*.6,ry*1.5,0,.3,Math.PI-.3);c.fill();
  const ic=ISLAND_COL[season()];const gr=c.createLinearGradient(0,y-ry,0,y+ry);gr.addColorStop(0,ic[0]);gr.addColorStop(1,ic[1]);c.fillStyle=gr;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();
  const r=rng(7);c.strokeStyle='#5f9443';c.lineWidth=1.2;c.lineCap='round';
  for(let i=0;i<14;i++){const a=r()*TAU,d=.55+r()*.38;const gx=x+Math.cos(a)*rx*d,gy=y+Math.sin(a)*ry*d;if(Math.abs(gx-x)<rx*.18&&gy<y+ry*.3)continue;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx-2,gy-5);c.moveTo(gx,gy);c.lineTo(gx+2,gy-6);c.stroke();}
}
function butterfly(c,x,y,t,s){
  const f=Math.abs(Math.sin(t*9))*.8+.2;c.save();c.translate(x,y);c.rotate(Math.sin(t*1.3)*.25);
  c.fillStyle='#f2a7c3';c.beginPath();c.ellipse(-s*f*.5,-s*.2,s*.5*f,s*.45,-.3,0,TAU);c.ellipse(s*f*.5,-s*.2,s*.5*f,s*.45,.3,0,TAU);c.fill();
  c.fillStyle='#e58aac';c.beginPath();c.ellipse(-s*f*.4,s*.25,s*.35*f,s*.3,.3,0,TAU);c.ellipse(s*f*.4,s*.25,s*.35*f,s*.3,-.3,0,TAU);c.fill();
  c.fillStyle='#3b2a2a';c.fillRect(-s*.06,-s*.45,s*.12,s*.9);c.restore();
}
function fitCanvas(cv,w,h){const d=Math.min(window.devicePixelRatio||1,3);cv.width=Math.max(1,Math.round(w*d));cv.height=Math.max(1,Math.round(h*d));const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return c;}
function thumb(cv,sp,o){const r=cv.getBoundingClientRect();const w=r.width||cv.width,h=r.height||cv.height;const c=fitCanvas(cv,w,h);c.clearRect(0,0,w,h);const s=Math.min(w,h)*(o&&o.scale||.78);drawPlant(c,sp,w/2,h*.9,s,o&&o.g!=null?o.g:1,1.2,o);}

/* ---------- seasons, night, weather particles ---------- */
function season(d){d=d||new Date();const m=d.getMonth();return m<2||m===11?'winter':m<5?'spring':m<8?'summer':'autumn';}
function isNight(d){d=d||new Date();const h=d.getHours();return h>=20||h<6;}
const SEASON_NAME={spring:'Primavera',summer:'Estate',autumn:'Autunno',winter:'Inverno'};
const GRASS={spring:['#93c86b','#8ac062','#9ccf72','#86bd5f'],summer:['#86bd5f','#7fb658','#8ac062','#7aaf55'],autumn:['#adbf66','#a0b65d','#b6c46e','#a6b961'],winter:['#d3ddcf','#c9d6c4','#dbe4d8','#cdd9c9']};
const ISLAND_COL={spring:['#94c66a','#6fa34f'],summer:['#8cc063','#669c47'],autumn:['#b3c46a','#8fa64e'],winter:['#e3ebe0','#bccbb8']};
function seasonPal(sp,P){
  const s=season();
  if(s==='autumn'){
    if(sp.k==='oak')Object.assign(P,{leaf:'#d98b2b',leaf2:'#b8661f',leaf3:'#f0b94a'});
    if(sp.k==='cherry')Object.assign(P,{leaf:'#d0662e',leaf2:'#a84a22',leaf3:'#eb9a4a',flower:'#d0662e',flower2:'#a84a22'});
    if(sp.k==='willow')Object.assign(P,{leaf:'#d6b24a',leaf2:'#b8923a',leaf3:'#ecd27a'});
  }else if(s==='winter'){
    if(sp.k==='fir')Object.assign(P,{leaf:'#e4ece8'});
    if(sp.k==='oak')Object.assign(P,{leaf:'#8d9a80',leaf2:'#6f7d64',leaf3:'#f1f5f1'});
    if(sp.k==='cherry')Object.assign(P,{leaf:'#eef2f4',leaf2:'#cfd8de',leaf3:'#ffffff',flower:'#eef2f4',flower2:'#cfd8de'});
    if(sp.k==='willow')Object.assign(P,{leaf:'#c9d3c2',leaf2:'#a9b4a2',leaf3:'#f1f5f1'});
  }else if(s==='summer'){
    if(sp.k==='cherry')Object.assign(P,{flower:'#5f9e4a',flower2:'#4a843c'});
  }
}
function glow(c,x,y,r,a){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(255,236,140,'+a+')');g.addColorStop(1,'rgba(255,236,140,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);dot(c,x,y,r*.18,'rgba(255,248,200,'+Math.min(1,a*1.6)+')');}
function weather(c,x0,y0,W,H,t,n){
  if(REDUCED)return;const s=season(),night=isNight();
  for(let i=0;i<n;i++){
    const r1=((i*137.5)%100)/100,r2=((i*71.3)%100)/100;
    if(s==='autumn'){const ph=(t*.05+r2)%1;const x=x0+r1*W+Math.sin(t*.8+i)*W*.04,y=y0+ph*H;c.save();c.translate(x,y);c.rotate(t*1.5+i);oval(c,0,0,W*.012,W*.006,0,i%3?'#d98b2b':'#b8661f');c.restore();}
    else if(s==='winter'){const ph=(t*.04+r2)%1;dot(c,x0+r1*W+Math.sin(t*.6+i)*W*.03,y0+ph*H,W*(.004+.003*(i%3)),'rgba(255,255,255,.9)');}
    else if(s==='spring'&&i%2===0){const ph=(t*.04+r2)%1;c.save();c.translate(x0+r1*W+Math.sin(t+i)*W*.05,y0+ph*H);c.rotate(t+i);oval(c,0,0,W*.009,W*.005,0,'#f6bccb');c.restore();}
  }
  if(night&&s!=='winter')for(let i=0;i<Math.ceil(n/3);i++){const r1=((i*53.7)%100)/100,r2=((i*29.1)%100)/100;const a=.35+.35*Math.sin(t*2+i*1.7);glow(c,x0+r1*W+Math.sin(t*.4+i)*W*.04,y0+H*.35+r2*H*.55+Math.cos(t*.5+i)*H*.03,W*.03,a);}
}

/* ---------- animals that move in ---------- */
const ANIMALS=[
  {k:'ladybug',n:'Coccinella',hint:'Arriva con la prima pianta',test:z=>z.plants>=1},
  {k:'robin',n:'Pettirosso',hint:'10 piante nel bosco',test:z=>z.plants>=10},
  {k:'hedgehog',n:'Riccio',hint:'3 giorni di fila',test:z=>z.streak>=3},
  {k:'bunny',n:'Coniglio',hint:'10 ore di concentrazione in tutto',test:z=>z.hours>=10},
  {k:'squirrel',n:'Scoiattolo',hint:'25 piante nel bosco',test:z=>z.plants>=25},
  {k:'owl',n:'Gufo',hint:'5 sessioni dopo le 21',test:z=>z.night>=5},
  {k:'fawn',n:'Cerbiatto',hint:'3 pomodori insieme',test:z=>z.together>=3},
  {k:'fox',n:'Volpe',hint:'25 ore di concentrazione in tutto',test:z=>z.hours>=25},
];
const ANIMAL=Object.fromEntries(ANIMALS.map(a=>[a.k,a]));
function forestStats(){
  const all=allItems().filter(x=>x.s[5]===1);const tog=new Set();
  all.forEach(x=>{if(x.s[10])tog.add(x.s[10]);});
  let best=streak();others.forEach(o=>{const days=new Set();Object.values(o.sess).forEach(l=>l.forEach(s=>{if(s[5]===1)days.add(dayKey(s[1]));}));let d=new Date();d.setHours(12,0,0,0);if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);let n=0;while(days.has(dayKey(d))){n++;d.setDate(d.getDate()-1);}best=Math.max(best,n);});
  return{plants:all.filter(x=>!isWork(x.s)).length,hours:all.reduce((t,x)=>t+x.s[2],0)/60,night:all.filter(x=>{const h=new Date(x.s[1]).getHours();return h>=21||h<5;}).length,together:tog.size,streak:best};
}
function faunaNow(){const z=forestStats();return ANIMALS.filter(a=>a.test(z)).map(a=>a.k);}
function checkFauna(){
  const now=faunaNow();S.fauna=Array.isArray(S.fauna)?S.fauna:[];const fresh=now.filter(k=>!S.fauna.includes(k));
  if(!fresh.length)return;S.fauna=S.fauna.concat(fresh);commit();
  const a=ANIMAL[fresh[fresh.length-1]];const fem=a.k==='ladybug'||a.k==='fox';setTimeout(()=>toast((fem?'Una ':'Un ')+a.n+' si è trasferit'+(fem?'a':'o')+' nel bosco!'),600);
}
function drawAnimal(c,k,x,y,s,t){
  t=REDUCED?0:(t||0);c.save();c.translate(x,y);oval(c,0,0,s*.28,s*.06,0,'rgba(30,40,20,.2)');
  const bob=Math.sin(t*2)*s*.01;c.translate(0,bob);
  if(k==='ladybug'){c.fillStyle='#d8352a';c.beginPath();c.ellipse(0,-s*.1,s*.14,s*.1,0,Math.PI,TAU);c.fill();rect(c,-s*.005,-s*.2,s*.01,s*.1,'#1d1a1a');dot(c,s*.15,-s*.06,s*.05,'#1d1a1a');[[-.07,-.13],[.06,-.14],[-.03,-.06]].forEach(([a,b])=>dot(c,a*s,b*s,s*.022,'#1d1a1a'));}
  if(k==='robin'){oval(c,0,-s*.2,s*.16,s*.13,0,'#7a5a3a');oval(c,s*.06,-s*.18,s*.09,s*.09,0,'#e4762f');dot(c,s*.13,-s*.33,s*.08,'#7a5a3a');dot(c,s*.16,-s*.35,s*.015,'#111');c.fillStyle='#e0b23a';c.beginPath();c.moveTo(s*.2,-s*.34);c.lineTo(s*.27,-s*.32);c.lineTo(s*.2,-s*.3);c.fill();c.fillStyle='#5e4430';c.beginPath();c.moveTo(-s*.14,-s*.22);c.lineTo(-s*.3,-s*.3+Math.sin(t*3)*s*.02);c.lineTo(-s*.13,-s*.16);c.fill();rect(c,-s*.01,-s*.08,s*.015,s*.08,'#b3743a');rect(c,s*.04,-s*.08,s*.015,s*.08,'#b3743a');}
  if(k==='hedgehog'){c.fillStyle='#6d5038';c.beginPath();c.moveTo(-s*.26,-s*.02);for(let i=0;i<=10;i++){const a=Math.PI+i/10*Math.PI;const r=i%2?s*.26:s*.2;c.lineTo(Math.cos(a)*r*1.1,-s*.02+Math.sin(a)*r*.9);}c.closePath();c.fill();oval(c,s*.22,-s*.08,s*.1,s*.06,-.2,'#d9b98c');dot(c,s*.31,-s*.1,s*.025,'#2a1d14');dot(c,s*.21,-s*.12,s*.015,'#2a1d14');}
  if(k==='bunny'){oval(c,0,-s*.14,s*.17,s*.13,0,'#cfc6bb');dot(c,-s*.17,-s*.16,s*.05,'#fff');dot(c,s*.15,-s*.26,s*.09,'#cfc6bb');const e=Math.sin(t*1.3)*.1;oval(c,s*.12,-s*.42,s*.03,s*.11,-.2+e,'#cfc6bb');oval(c,s*.19,-s*.42,s*.03,s*.11,.15+e,'#cfc6bb');oval(c,s*.12,-s*.42,s*.012,s*.07,-.2+e,'#e9b9b9');dot(c,s*.19,-s*.27,s*.015,'#2a1d14');dot(c,s*.24,-s*.24,s*.015,'#e48a9a');}
  if(k==='squirrel'){c.strokeStyle='#c46a2a';c.lineWidth=s*.12;c.lineCap='round';c.beginPath();c.moveTo(-s*.1,-s*.08);c.quadraticCurveTo(-s*.4,-s*.2+Math.sin(t*2)*s*.02,-s*.18,-s*.48);c.stroke();oval(c,0,-s*.15,s*.11,s*.14,0,'#d77a33');dot(c,s*.07,-s*.32,s*.08,'#d77a33');c.fillStyle='#d77a33';c.beginPath();c.moveTo(s*.04,-s*.38);c.lineTo(s*.06,-s*.47);c.lineTo(s*.1,-s*.38);c.fill();dot(c,s*.1,-s*.33,s*.014,'#2a1d14');oval(c,s*.06,-s*.14,s*.05,s*.07,0,'#f0d3a8');}
  if(k==='owl'){oval(c,0,-s*.22,s*.15,s*.22,0,'#8a6440');oval(c,0,-s*.16,s*.1,s*.14,0,'#c9a578');const bl=Math.abs(Math.sin(t*.7))>.97?.2:1;[-1,1].forEach(d=>{dot(c,d*s*.065,-s*.32,s*.055,'#f4ead2');oval(c,d*s*.065,-s*.32,s*.025,s*.025*bl,0,'#1d1a1a');});c.fillStyle='#e0a02a';c.beginPath();c.moveTo(-s*.02,-s*.27);c.lineTo(s*.02,-s*.27);c.lineTo(0,-s*.22);c.fill();c.fillStyle='#8a6440';[-1,1].forEach(d=>{c.beginPath();c.moveTo(d*s*.13,-s*.38);c.lineTo(d*s*.14,-s*.47);c.lineTo(d*s*.06,-s*.41);c.fill();});}
  if(k==='fawn'){[[-.13,0],[-.07,0],[.08,0],[.14,0]].forEach(([a])=>rect(c,a*s,-s*.2,s*.03,s*.2,'#a5713f'));oval(c,0,-s*.26,s*.2,s*.1,0,'#b97d45');[[-.08,-.28],[0,-.3],[.07,-.27],[-.03,-.23]].forEach(([a,b])=>dot(c,a*s,b*s,s*.015,'#f3e3c8'));c.strokeStyle='#b97d45';c.lineWidth=s*.06;c.beginPath();c.moveTo(s*.16,-s*.3);c.lineTo(s*.22,-s*.45);c.stroke();oval(c,s*.26,-s*.47,s*.08,s*.055,.3,'#b97d45');oval(c,s*.2,-s*.53,s*.025,s*.05,-.5,'#a5713f');dot(c,s*.28,-s*.49,s*.014,'#1d1a1a');dot(c,s*.33,-s*.45,s*.014,'#1d1a1a');}
  if(k==='fox'){c.strokeStyle='#d0612a';c.lineWidth=s*.1;c.lineCap='round';c.beginPath();c.moveTo(-s*.18,-s*.18);c.quadraticCurveTo(-s*.38,-s*.12+Math.sin(t*1.5)*s*.03,-s*.36,-s*.04);c.stroke();dot(c,-s*.37,-s*.04,s*.045,'#fff');[-.12,-.05,.08,.14].forEach(a=>rect(c,a*s,-s*.12,s*.03,s*.12,'#3a2a22'));oval(c,0,-s*.18,s*.2,s*.09,0,'#d86a2e');c.fillStyle='#d86a2e';c.beginPath();c.moveTo(s*.14,-s*.22);c.lineTo(s*.34,-s*.3);c.lineTo(s*.18,-s*.38);c.closePath();c.fill();c.beginPath();c.moveTo(s*.17,-s*.36);c.lineTo(s*.19,-s*.47);c.lineTo(s*.24,-s*.37);c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(s*.2,-s*.27);c.lineTo(s*.34,-s*.3);c.lineTo(s*.22,-s*.31);c.fill();dot(c,s*.24,-s*.32,s*.014,'#1d1a1a');dot(c,s*.34,-s*.3,s*.015,'#1d1a1a');}
  c.restore();
}

/* ---------- couple willow + pomodoro insieme ---------- */
const WILLOW_TOP=[[0,-.74,.2],[-.2,-.66,.15],[.2,-.67,.15],[-.1,-.84,.12],[.11,-.85,.12]];
function dWillow(c,s,g,t,P){
  const k=.3+.7*phase(g,0,.9),cp=phase(g,.1,.8);c.save();c.scale(k,k);
  trunk(c,s,.6,.08,P.trunk,[[0,-.46,-.24,-.64,.03],[0,-.5,.25,-.66,.03]]);
  canopy(c,s,WILLOW_TOP,cp,[P.leaf2,P.leaf,P.leaf3],t);
  c.lineCap='round';
  for(let i=0;i<26;i++){const u=i/25,x=(-.4+u*.8)*s,top=(-.62-.16*Math.sin(u*Math.PI))*s,L=s*(.36+.14*Math.sin(i*1.7))*cp,sw=Math.sin(t*.9+i*.5)*s*.025*cp;
    c.strokeStyle=i%2?P.leaf2:P.leaf;c.lineWidth=Math.max(1,s*.014);c.beginPath();c.moveTo(x,top);c.quadraticCurveTo(x+sw*.3,top+L*.5,x+sw,top+L);c.stroke();
    for(let j=1;j<4;j++)oval(c,x+sw*j/4,top+L*j/4,s*.012,s*.022,.3,P.leaf3);}
  if(P._rare)sparkles(c,s,t);
  c.restore();
}
const offerFresh=o=>o&&Date.now()-o.at<15*60000;
function sendInvite(){
  if(busy(S.active)){toast('Finisci prima il pomodoro in corso.');return;}
  if(offerFresh(S.offer)){toast('Invito già mandato: aspetta che accetti.');return;}
  const dur=Math.max(10,S.settings.focus||25);
  S.offer={id:uid(),dur,at:Date.now()};commit();
  notify('invite','Facciamo un pomodoro insieme da '+dur+' min? Se finite tutti e due cresce un Salice di coppia.');
  toast('Invito mandato. Appena accetta, partite insieme.');
}
function startTogether(off,withId,startAt){
  ensureAudio();S.mode='focus';afterglow=null;lastBlock=-1;
  S.active={id:uid(),kind:'focus',start:startAt,dur:off.dur,sp:'willow',tag:S.sel.tag,note:'',together:{id:off.id,with:withId}};
  startAmbient(S.settings.sound);heartbeat();lockOn();scheduleEnd(S.active);commit();
}
function acceptInvite(fromId){
  const o=others.get(fromId),off=o&&o.prof&&o.prof.offer;
  if(!offerFresh(off)){toast('L’invito è scaduto. Mandane uno tu!');return;}
  if(busy(S.active)){toast('Hai già un pomodoro in corso.');return;}
  startTogether(off,fromId,Date.now());show('focus');
  notify('status','Ha accettato! Il Salice di coppia inizia a crescere.');
}
function checkTogether(){
  if(S.offer&&!busy(S.active)){
    for(const[id,o]of others){const pa=o.prof&&o.prof.active;
      if(pa&&pa.together&&pa.together.id===S.offer.id&&endTs(pa)>Date.now()){const off=S.offer;S.offer=null;startTogether(off,id,pa.start);toast(nm(id)+' ha accettato: il salice inizia a crescere.');return;}}
    if(!offerFresh(S.offer)){S.offer=null;commit();return;}
  }
  const a=S.active;
  if(a&&a.together){const o=others.get(a.together.with);if(!o)return;let failed=false;
    Object.values(o.sess).forEach(l=>l.forEach(s=>{if(s[10]===a.together.id&&s[5]===0)failed=true;}));
    if(failed)giveUp(nm(a.together.with)+' ha interrotto il pomodoro: il salice è appassito per tutti e due.');}
}

/* ---------- end-of-timer push, scheduled on the server ---------- */
function scheduleEnd(a){
  try{if(!window.SB||!a||a.kind==='work')return;const uidv=(window.SOTTOBOSCO_USER||{}).id;if(!uidv)return;
    let title,body;
    if(a.kind==='focus'){const sp=SP[a.sp]||SP.daisy;title='Pomodoro finito';body=artName(sp)+' è cresciut'+(sp.f?'a':'o')+'. Apri Sottobosco per piantarl'+(sp.f?'a':'o')+' nel bosco.';}
    else{title='Pausa finita';body='Pronto per il prossimo pomodoro?';}
    window.SB.from('timers').upsert({user_id:uidv,end_at:new Date(endTs(a)).toISOString(),title,body}).then(()=>{},()=>{});
  }catch(e){}
}
function clearEnd(){try{const uidv=(window.SOTTOBOSCO_USER||{}).id;if(window.SB&&uidv)window.SB.from('timers').delete().eq('user_id',uidv).then(()=>{},()=>{});}catch(e){}}

/* ---------- the gnome and what he builds ---------- */
const BLOCK_MS=15*60000,WORK_CAP=480;
function drawGnome(c,x,y,s,t,act){
  if(REDUCED)t=0;
  const sw=act==='hammer'?Math.sin(t*6):act==='hoe'?Math.sin(t*2.6):act==='wave'?Math.sin(t*5):0;
  const bob=(act==='hoe'||act==='hammer')?Math.abs(sw)*s*.015:Math.sin(t*1.5)*s*.006;
  c.save();c.translate(x,y);oval(c,0,0,s*.22,s*.05,0,'rgba(30,40,20,.25)');c.translate(0,-bob);
  oval(c,-s*.08,-s*.03,s*.08,s*.04,0,'#4a2f1f');oval(c,s*.08,-s*.03,s*.08,s*.04,0,'#4a2f1f');
  c.fillStyle='#3f6fb0';c.beginPath();c.moveTo(-s*.17,-s*.06);c.quadraticCurveTo(-s*.19,-s*.42,-s*.1,-s*.52);c.lineTo(s*.1,-s*.52);c.quadraticCurveTo(s*.19,-s*.42,s*.17,-s*.06);c.closePath();c.fill();
  c.fillStyle='#3b2618';c.fillRect(-s*.175,-s*.22,s*.35,s*.045);c.fillStyle='#e8b93a';c.fillRect(-s*.03,-s*.228,s*.06,s*.06);
  // head
  dot(c,0,-s*.58,s*.1,'#f2c6a0');
  c.fillStyle='#f4f1ea';c.beginPath();c.moveTo(-s*.115,-s*.58);c.quadraticCurveTo(-s*.13,-s*.38,0,-s*.31);c.quadraticCurveTo(s*.13,-s*.38,s*.115,-s*.58);c.quadraticCurveTo(0,-s*.5,-s*.115,-s*.58);c.fill();
  dot(c,0,-s*.565,s*.036,'#e79a86');dot(c,-s*.042,-s*.612,s*.013,'#2a1d14');dot(c,s*.042,-s*.612,s*.013,'#2a1d14');
  c.fillStyle='#d23b2f';c.beginPath();c.moveTo(-s*.14,-s*.63);c.quadraticCurveTo(-s*.07,-s*.92,s*.12+Math.sin(t*1.2)*s*.012,-s*1.02);c.quadraticCurveTo(s*.04,-s*.84,s*.14,-s*.63);c.closePath();c.fill();
  oval(c,0,-s*.635,s*.15,s*.03,0,'#b02e25');
  // arm + tool, pivot at the hand
  const hx=s*.17,hy=-s*.33;
  c.strokeStyle='#3f6fb0';c.lineWidth=s*.07;c.lineCap='round';c.beginPath();c.moveTo(s*.08,-s*.46);c.lineTo(hx,hy);c.stroke();
  c.save();c.translate(hx,hy);
  if(act==='hoe'||act==='idle'){c.rotate(act==='idle'?.12:-.55+sw*.35);c.strokeStyle='#9a6b3f';c.lineWidth=s*.035;c.beginPath();c.moveTo(0,-s*.28);c.lineTo(0,s*.33);c.stroke();c.fillStyle='#6f7479';c.fillRect(-s*.01,s*.3,s*.12,s*.05);}
  else if(act==='hammer'){c.rotate(-.2+sw*.8);c.strokeStyle='#9a6b3f';c.lineWidth=s*.035;c.beginPath();c.moveTo(0,s*.03);c.lineTo(0,-s*.24);c.stroke();c.fillStyle='#6f7479';c.fillRect(-s*.07,-s*.3,s*.14,s*.07);}
  else if(act==='water'){c.rotate(.35);c.fillStyle='#8e9aa6';c.fillRect(-s*.02,-s*.04,s*.16,s*.12);c.strokeStyle='#8e9aa6';c.lineWidth=s*.025;c.beginPath();c.moveTo(s*.14,0);c.lineTo(s*.27,-s*.06);c.stroke();
    if(!REDUCED)for(let i=0;i<4;i++){const ph=(t*1.6+i/4)%1;dot(c,s*.28+ph*s*.05,-s*.04+ph*s*.3,s*.014,'#7fb8e0');}}
  else if(act==='wave'){c.rotate(-1.9+sw*.35);c.strokeStyle='#3f6fb0';c.lineWidth=s*.07;c.beginPath();c.moveTo(0,0);c.lineTo(0,-s*.12);c.stroke();dot(c,0,-s*.15,s*.04,'#f2c6a0');c.restore();c.restore();return;}
  dot(c,0,0,s*.04,'#f2c6a0');c.restore();c.restore();
}
function rect(c,x,y,w,h,col){c.fillStyle=col;c.fillRect(x,y,w,h);}
const ITEMS=[
  {k:'mushrooms',n:'Funghi',tier:0,tool:'hoe',d:(c,s)=>{[[-.16,0,.75],[.12,.02,1],[-.01,.05,.55]].forEach(([x,y,k])=>{rect(c,(x-.03*k)*s,(y-.13*k)*s,.06*k*s,.13*k*s,'#efe6d2');c.fillStyle='#d33a2c';c.beginPath();c.ellipse(x*s,(y-.13*k)*s,.12*k*s,.09*k*s,0,Math.PI,TAU);c.fill();dot(c,(x-.05*k)*s,(y-.17*k)*s,.018*k*s,'#fff');dot(c,(x+.04*k)*s,(y-.19*k)*s,.014*k*s,'#fff');});}},
  {k:'stones',n:'Mucchio di sassi',tier:0,tool:'hoe',d:(c,s)=>{oval(c,-.12*s,-.05*s,.13*s,.08*s,0,'#8f8f86');oval(c,.12*s,-.05*s,.12*s,.07*s,0,'#a3a299');oval(c,0,-.14*s,.11*s,.08*s,0,'#b6b5ab');dot(c,-.03*s,-.18*s,.03*s,'rgba(255,255,255,.3)');}},
  {k:'fence',n:'Staccionata',tier:0,tool:'hammer',d:(c,s)=>{[-.3,0,.3].forEach(x=>{c.fillStyle='#b48a5a';c.beginPath();c.moveTo((x-.03)*s,0);c.lineTo((x-.03)*s,-.3*s);c.lineTo(x*s,-.35*s);c.lineTo((x+.03)*s,-.3*s);c.lineTo((x+.03)*s,0);c.fill();});rect(c,-.34*s,-.13*s,.68*s,.04*s,'#a07a4c');rect(c,-.34*s,-.25*s,.68*s,.04*s,'#a07a4c');}},
  {k:'lantern',n:'Lanterna',tier:1,tool:'hammer',d:(c,s)=>{const g=c.createRadialGradient(0,-.62*s,0,0,-.62*s,.3*s);g.addColorStop(0,'rgba(255,215,106,.55)');g.addColorStop(1,'rgba(255,215,106,0)');c.fillStyle=g;c.fillRect(-.3*s,-.92*s,.6*s,.6*s);rect(c,-.025*s,-.55*s,.05*s,.55*s,'#4a3a2e');rect(c,-.07*s,-.72*s,.14*s,.18*s,'#3a2e25');rect(c,-.05*s,-.7*s,.1*s,.14*s,'#ffd76a');c.fillStyle='#3a2e25';c.beginPath();c.moveTo(-.09*s,-.72*s);c.lineTo(0,-.8*s);c.lineTo(.09*s,-.72*s);c.fill();}},
  {k:'bench',n:'Panchina',tier:1,tool:'hammer',d:(c,s)=>{rect(c,-.26*s,-.15*s,.04*s,.15*s,'#5a4030');rect(c,.22*s,-.15*s,.04*s,.15*s,'#5a4030');rect(c,-.3*s,-.19*s,.6*s,.05*s,'#b8864f');rect(c,-.26*s,-.4*s,.04*s,.22*s,'#5a4030');rect(c,.22*s,-.4*s,.04*s,.22*s,'#5a4030');rect(c,-.3*s,-.3*s,.6*s,.045*s,'#c4935a');rect(c,-.3*s,-.39*s,.6*s,.045*s,'#c4935a');}},
  {k:'hive',n:'Alveare',tier:1,tool:'water',d:(c,s,t)=>{rect(c,-.13*s,-.08*s,.26*s,.08*s,'#7a5638');[[.17,.07,'#d9a441'],[.16,.07,'#c48f33'],[.14,.065,'#d9a441'],[.11,.06,'#c48f33'],[.07,.05,'#d9a441']].forEach(([rx,ry,col],i)=>oval(c,0,-(.13+i*.075)*s,rx*s,ry*s,0,col));dot(c,0,-.13*s,.03*s,'#3a2412');for(let i=0;i<3;i++){const a=t*2+i*2.1;dot(c,Math.cos(a)*.24*s,(-.3+Math.sin(a*1.3)*.12)*s,.014*s,'#2a1d14');}}},
  {k:'pond',n:'Laghetto',tier:2,tool:'hoe',flat:true,d:(c,s)=>{oval(c,0,-.06*s,.46*s,.17*s,0,'#9b968c');oval(c,0,-.07*s,.41*s,.14*s,0,'#3f86b8');oval(c,-.1*s,-.1*s,.16*s,.04*s,0,'rgba(255,255,255,.25)');oval(c,.15*s,-.04*s,.07*s,.03*s,0,'#5aa04a');dot(c,.17*s,-.05*s,.015*s,'#f4c2d2');c.strokeStyle='#5f9443';c.lineWidth=Math.max(1,.015*s);[-.36,-.32,-.28].forEach((x,i)=>{c.beginPath();c.moveTo(x*s,-.05*s);c.lineTo((x-.02)*s,-(.25+i*.04)*s);c.stroke();});}},
  {k:'well',n:'Pozzo',tier:2,tool:'hammer',d:(c,s)=>{rect(c,-.2*s,-.24*s,.4*s,.24*s,'#9b968c');c.strokeStyle='rgba(60,50,40,.25)';c.lineWidth=1;for(let i=1;i<3;i++){c.beginPath();c.moveTo(-.2*s,-.08*i*s);c.lineTo(.2*s,-.08*i*s);c.stroke();}oval(c,0,-.24*s,.2*s,.06*s,0,'#b4afa4');oval(c,0,-.24*s,.15*s,.04*s,0,'#2c4a5e');rect(c,-.2*s,-.62*s,.035*s,.38*s,'#7a5638');rect(c,.165*s,-.62*s,.035*s,.38*s,'#7a5638');c.fillStyle='#b4432c';c.beginPath();c.moveTo(-.28*s,-.58*s);c.lineTo(0,-.78*s);c.lineTo(.28*s,-.58*s);c.fill();rect(c,-.03*s,-.45*s,.06*s,.07*s,'#8a6a44');}},
  {k:'house',n:'Casetta',tier:2,tool:'hammer',d:(c,s)=>{rect(c,-.2*s,-.32*s,.4*s,.32*s,'#eadcbe');c.fillStyle='#7a5638';c.beginPath();c.moveTo(-.07*s,0);c.lineTo(-.07*s,-.13*s);c.arc(0,-.13*s,.07*s,Math.PI,0);c.lineTo(.07*s,0);c.fill();dot(c,.12*s,-.2*s,.04*s,'#ffd76a');c.fillStyle='#c8372b';c.beginPath();c.ellipse(0,-.32*s,.33*s,.25*s,0,Math.PI,TAU);c.fill();[[-.18,-.4,.04],[.06,-.47,.05],[.2,-.37,.03],[-.04,-.36,.025]].forEach(([x,y,r])=>dot(c,x*s,y*s,r*s,'#fff'));}},
  {k:'scarecrow',n:'Spaventapasseri',tier:2,tool:'hammer',d:(c,s)=>{rect(c,-.02*s,-.72*s,.04*s,.72*s,'#8a6a44');rect(c,-.26*s,-.52*s,.52*s,.035*s,'#8a6a44');c.fillStyle='#5b7fb5';c.beginPath();c.moveTo(-.24*s,-.54*s);c.lineTo(.24*s,-.54*s);c.lineTo(.12*s,-.28*s);c.lineTo(-.12*s,-.28*s);c.fill();c.strokeStyle='#e8c35a';c.lineWidth=Math.max(1,.015*s);[-1,1].forEach(sd=>{for(let i=0;i<3;i++){c.beginPath();c.moveTo(sd*.25*s,-.52*s);c.lineTo(sd*(.3+i*.01)*s,(-.47+i*.03)*s);c.stroke();}});dot(c,0,-.63*s,.075*s,'#e7c98a');oval(c,0,-.69*s,.13*s,.025*s,0,'#6b4a32');rect(c,-.07*s,-.8*s,.14*s,.11*s,'#6b4a32');}},
];
const ITEM=Object.fromEntries(ITEMS.map(i=>[i.k,i]));
function hstr(str){let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);return h>>>0;}
function itemFor(id,b){const r=rng(hstr(String(id))+b*7919);r();const x=r();const tier=b===0?0:b===1?1:(x<.45?2:x<.8?1:0);const pool=ITEMS.filter(i=>i.tier===tier);return pool[Math.floor(r()*pool.length)].k;}
function workBuilt(a,now){const el=Math.max(0,Math.min(now,endTs(a))-a.start);const b=Math.floor(el/BLOCK_MS);const out=[];for(let i=0;i<b;i++)out.push(itemFor(a.id,i));return{el,b,built:out,cur:itemFor(a.id,b),prog:(el%BLOCK_MS)/BLOCK_MS};}
function drawItem(c,key,x,y,s,k,t){const it=ITEM[key];if(!it||k<=0)return;c.save();c.translate(x,y);c.globalAlpha=Math.min(1,k*1.6);c.scale(.35+.65*k,.35+.65*k);it.d(c,s,REDUCED?0:(t||0));c.restore();}
function workScene(c,cx,cy,W,t,o){
  const rx=W*.27,ry=rx*.27,s=W*.24;const ents=[];
  const slots=[[-.58,-.5],[.55,-.55],[-.08,-.85],[-.8,.05],[.8,-.1]];
  (o.built||[]).slice(-5).forEach((k,i)=>{const[sx,sy]=slots[i];ents.push({y:cy+sy*ry,f:()=>drawItem(c,k,cx+sx*rx,cy+sy*ry,s*(ITEM[k].flat?1.1:.9),1,t)});});
  if(o.cur)ents.push({y:cy+.15*ry,f:()=>drawItem(c,o.cur,cx+.45*rx,cy+.15*ry,s*(ITEM[o.cur].flat?1.1:.95),Math.max(.06,o.prog),t)});
  ents.push({y:cy+.35*ry,f:()=>drawGnome(c,cx-.22*rx,cy+.35*ry,W*.3,t,o.act)});
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.f());
}
function thumbItem(cv,key){const r=cv.getBoundingClientRect();const w=r.width||40,h=r.height||40;const c=fitCanvas(cv,w,h);c.clearRect(0,0,w,h);drawItem(c,key,w/2,h*.88,Math.min(w,h)*(ITEM[key].flat?.95:.95),1,1);}
function thumbGnome(cv){const r=cv.getBoundingClientRect();const w=r.width||40,h=r.height||40;const c=fitCanvas(cv,w,h);c.clearRect(0,0,w,h);drawGnome(c,w/2,h*.92,Math.min(w,h)*.82,1,'idle');}

/* ---------- state ---------- */
const TAGS=[{n:'Studio',c:'#4f86d9'},{n:'Lavoro',c:'#d0832b'},{n:'Lettura',c:'#9a68c9'},{n:'Creatività',c:'#d4517a'},{n:'Sport',c:'#2fa37a'},{n:'Casa',c:'#8b8f3a'},{n:'Altro',c:'#7d8a84'}];
const SOUNDS=[['off','Silenzio'],['rain','Pioggia'],['brook','Ruscello'],['wind','Vento'],['crickets','Grilli']];
const QUOTES=['Le radici crescono in silenzio.','Una foglia alla volta.','Il bosco non ha fretta, eppure tutto si compie.','Resta qui: la tua pianta ti sta aspettando.','Ogni minuto è un anello in più nel tronco.','Telefono giù, linfa su.','Terreno fertile: niente notifiche.','Respira. Anche gli alberi lo fanno.'];
const LIMITS={focus:{min:10,max:120,step:5},work:{min:15,max:15,step:1},short:{min:1,max:15,step:1},long:{min:5,max:45,step:5}};
function defaultState(){return{v:1,updatedAt:0,sessions:[],unlocked:['daisy','clover'],settings:{focus:25,short:5,long:15,every:4,strict:false,chime:true,vol:.6,sound:'off',partnerAlerts:true,shareActivity:true},sel:{sp:'daisy',tag:0},mode:'focus',active:null,cycle:0};}
const LS='sottobosco.v1.'+((window.SOTTOBOSCO_USER||{}).id||'local');
function loadLocal(){try{const r=localStorage.getItem(LS);if(r){const o=JSON.parse(r);return normalize(o);}}catch(e){}return null;}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(S));}catch(e){}}
function normalize(o){const d=defaultState();o=Object.assign(d,o||{});o.settings=Object.assign(defaultState().settings,o.settings||{});o.sel=Object.assign({sp:'daisy',tag:0},o.sel||{});if(!SP[o.sel.sp])o.sel.sp='daisy';if(!Array.isArray(o.sessions))o.sessions=[];if(!Array.isArray(o.unlocked))o.unlocked=['daisy','clover'];if(!LIMITS[o.mode])o.mode='focus';return o;}
function merge(a,b){
  if(!b||!Array.isArray(b.sessions))return a;b=normalize(JSON.parse(JSON.stringify(b)));
  const ra=a.resetAt||0,rb=b.resetAt||0,reset=Math.max(ra,rb);
  const newer=ra!==rb?(rb>ra?b:a):((b.updatedAt||0)>(a.updatedAt||0)?b:a),older=newer===a?b:a;
  const map=new Map();older.sessions.concat(newer.sessions).forEach(s=>{if(s[1]>=reset)map.set(s[0],s);});
  const out=normalize(JSON.parse(JSON.stringify(newer)));
  out.resetAt=reset;
  out.sessions=[...map.values()].sort((x,y)=>x[1]-y[1]);
  out.unlocked=ra===rb?[...new Set(a.unlocked.concat(b.unlocked))]:newer.unlocked.slice();
  if(out.active&&map.has(out.active.id))out.active=null;
  out.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);return out;
}
let S=loadLocal()||defaultState();
// session tuple: [id, startTs, minutes, speciesKey, tagIdx, ok(1/0), rare(1/0), seedsEarned, note]
const okS=()=>S.sessions.filter(s=>s[5]===1);
function seeds(){const earned=S.sessions.reduce((a,s)=>a+(s[7]||0),0);const spent=S.unlocked.reduce((a,k)=>a+(SP[k]?SP[k].price:0),0);return Math.max(0,earned-spent);}
function dayKey(ts){const d=new Date(ts);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();}
function streak(extraTs){const set=new Set(okS().map(s=>dayKey(s[1])));if(extraTs)set.add(dayKey(extraTs));let d=new Date();d.setHours(12,0,0,0);if(!set.has(dayKey(d)))d.setDate(d.getDate()-1);let n=0;while(set.has(dayKey(d))){n++;d.setDate(d.getDate()-1);}return n;}

/* ---------- persistence: local + shared forest ---------- */
// Cloud layout: forests/<id> holds a person's profile (settings, unlocked, active…),
// forests/<id>/sessions/<YYYY-MM> holds {list:[session tuples]} for that month.
// Everyone the page is shared with reads every forest; each person writes only their own.
let DB=null,U=null,myId=null,syncState='local',writing=false,syncT=null;
const dirty={prof:false,months:new Set()};
const others=new Map(); // id -> {prof, sess:{month:list}}
const names={},avatars={},colors={};
const mk=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
function markSess(ts){dirty.months.add(mk(ts));}
function commit(){S.updatedAt=Date.now();saveLocal();dirty.prof=true;scheduleSync();renderAll();}
function scheduleSync(){clearTimeout(syncT);syncT=setTimeout(flush,700);}
function profDoc(){const p=Object.assign({},S);delete p.sessions;return JSON.parse(JSON.stringify(p));}
async function flush(){
  if(!DB||!myId||writing)return;writing=true;let failed=null;
  if(dirty.prof){dirty.prof=false;try{await DB.doc('forests/'+myId).set(profDoc());}catch(e){dirty.prof=true;failed=e||{};}}
  for(const m of [...dirty.months]){if(failed)break;dirty.months.delete(m);try{await DB.doc('forests/'+myId+'/sessions/'+m).set({list:S.sessions.filter(s=>mk(s[1])===m)});}catch(e){dirty.months.add(m);failed=e||{};}}
  writing=false;
  if(failed){if(failed.code==='unavailable'||failed.code==='resource_exhausted')setTimeout(scheduleSync,2500+Math.random()*2000);else syncState='err';}
  else{syncState='ok';if(dirty.prof||dirty.months.size)scheduleSync();}
  renderSync();
}
function listsByMonth(arr){const o={};arr.forEach(s=>{const m=mk(s[1]);(o[m]=o[m]||[]).push(s);});return o;}
(async function initCloud(){
  try{
    if(!window.claude||!window.claude.use)return;
    const u=await window.claude.use('user');const db=await window.claude.use('db');if(!u||!db)return;
    const id=await u.id();if(!id)return;U=u;myId=id;DB=db;
    let legacy=null;try{const l=await DB.doc('data/users/'+myId+'/garden').get();if(l.exists)legacy=l.data();}catch(e){}
    const p=await DB.doc('forests/'+myId).get();const q=await DB.collection('forests/'+myId+'/sessions').get();
    const remoteSess=[];q.docs.forEach(d=>{const x=d.data();if(x&&Array.isArray(x.list))remoteSess.push(...x.list);});
    const remoteAt=p.exists?(p.data().updatedAt||0):0;
    if(legacy)S=merge(S,legacy);
    if(p.exists||remoteSess.length)S=merge(S,Object.assign({},p.exists?p.data():{updatedAt:0},{sessions:remoteSess}));
    saveLocal();
    const rm=listsByMonth(remoteSess.slice().sort((x,y)=>x[1]-y[1])),lm=listsByMonth(S.sessions);
    new Set(Object.keys(lm).concat(Object.keys(rm))).forEach(m=>{if(JSON.stringify(lm[m]||[])!==JSON.stringify(rm[m]||[]))dirty.months.add(m);});
    dirty.prof=!p.exists||S.updatedAt>remoteAt;
    syncState='ok';subscribe();scheduleSync();renderAll();checkActive();
  }catch(e){DB=null;syncState='local';renderSync();}
})();
function subscribe(){
  DB.collection('forests').onSnapshot(snap=>{
    snap.docs.forEach(d=>{const id=d.id,data=d.data();if(!data)return;
      if(id===myId){if((data.updatedAt||0)>(S.updatedAt||0)){S=merge(S,Object.assign({},data,{sessions:[]}));saveLocal();checkActive();}return;}
      let o=others.get(id);
      if(!o){o={prof:data,sess:{}};others.set(id,o);
        DB.collection('forests/'+id+'/sessions').onSnapshot(s2=>{s2.docs.forEach(m=>{const x=m.data();o.sess[m.id]=x&&Array.isArray(x.list)?x.list:[];});renderAll();},()=>{});}
      else o.prof=data;});
    renderAll();
  },()=>{});
  DB.collection('forests/'+myId+'/sessions').onSnapshot(snap=>{
    const ss=[];snap.docs.forEach(m=>{const x=m.data();if(x&&Array.isArray(x.list))ss.push(...x.list);});
    const before=JSON.stringify(S.sessions);S=merge(S,Object.assign(profDoc(),{updatedAt:0,sessions:ss}));
    if(JSON.stringify(S.sessions)!==before){saveLocal();renderAll();}
  },()=>{});
}
function resolveNames(){if(!U)return;const ids=[...others.keys()];if(myId)ids.push(myId);if(!ids.length)return;
  U.profiles(ids).then(ps=>{let ch=false;ids.forEach(id=>{const p=ps&&ps[id];if(!p)return;if(names[id]!==p.name||avatars[id]!==p.avatarUrl||colors[id]!==p.color){names[id]=p.name;avatars[id]=p.avatarUrl;colors[id]=p.color;ch=true;}});if(ch)renderAll();}).catch(()=>{});}
const isMine=id=>id===myId||id==='me';
const nm=id=>isMine(id)?'Tu':(names[id]||'Qualcuno');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function setNote(id,v){v=String(v||'').trim().slice(0,120);const s=S.sessions.find(x=>x[0]===id);if(!s||(s[8]||'')===v)return;s[8]=v;markSess(s[1]);commit();}
function renderPartners(){
  const box=$('#partners');if(!box)return;const now=Date.now();let h='';
  others.forEach((o,id)=>{const a=o.prof&&o.prof.active,sp=a&&SP[a.sp];const name=esc(nm(id));let line,small,live=false;
    if(a&&a.kind==='focus'&&sp&&endTs(a)>now){live=true;line=`<b>${name}</b> sta facendo crescere ${esc(artName(sp).replace(/^U/,'u'))}`;small=`ancora ${Math.max(1,Math.ceil((endTs(a)-now)/60000))} min${a.note?' · '+esc(a.note):''}`;}
    else if(a&&a.kind==='work'&&endTs(a)>now){live=true;const w=workBuilt(a,now);line=`<b>${name}</b> sta lavorando con lo gnomo`;small=`da ${fmtMin(Math.floor(w.el/60000))} · ${w.built.length} ${w.built.length===1?'lavoretto':'lavoretti'}${a.note?' · '+esc(a.note):''}`;}
    else if(a&&a.kind!=='focus'&&endTs(a)>now){line=`<b>${name}</b> è in pausa`;small='tra poco riprende a piantare';}
    else{const today=dayKey(now);let n=0,m=0;Object.values(o.sess).forEach(l=>l.forEach(s=>{if(s[5]===1&&dayKey(s[1])===today){n++;m+=s[2];}}));line=`<b>${name}</b> ${n?'oggi ha piantato '+n+(n===1?' pianta':' piante'):'oggi non ha ancora piantato'}`;small=n?fmtMin(m)+' di concentrazione':'Iniziate insieme: valgono 3 semi in più a testa';}
    const st=freshStatus(o.prof&&o.prof.status);const off=o.prof&&o.prof.offer;const invited=offerFresh(off)&&!(S.active&&S.active.together&&S.active.together.id===off.id)&&!(a&&a.together&&a.together.id===off.id);
    if(a&&a.together&&a.together.with===myId&&live){line=`<b>${name}</b> sta facendo crescere il Salice con te`;}
    if(invited&&!busy(S.active)){h+=`<div class="partner invite-card"><i class="dotc" style="background:${esc(ownerColor(id))}"></i><div><b>${name}</b> ti invita a un pomodoro insieme<small>${off.dur} min · se finite tutti e due cresce un Salice di coppia</small></div><button class="invite" data-accept="${esc(id)}">Accetta</button></div>`;}
    h+=`<div class="partner"><i class="dotc" style="background:${esc(ownerColor(id))}"></i><div>${line}<small>${small}</small>${st?`<span class="pstatus">«${esc(st.text)}» · ${agoTxt(st.at)}</span>`:''}</div>${live?'<span class="live" aria-label="adesso"></span>':(busy(S.active)?'':offerFresh(S.offer)?'<span class="waiting">Invito mandato</span>':'<button class="invite" data-invite="1">Pomodoro insieme?</button>')}</div>`;});
  box.innerHTML=h;box.hidden=!h;
}
setInterval(()=>{if(view==='focus'&&others.size)renderPartners();},20000);
/* ---------- messages between the two of you: status, invites, push ---------- */
const CFG=window.SOTTOBOSCO_CONFIG||{};
let lastInvite=0;
function notify(kind,text){try{if(window.SB&&text)window.SB.functions.invoke('notify',{body:{kind,text:String(text).slice(0,200)}}).catch(()=>{});}catch(e){}}
function agoTxt(ts){const m=Math.round((Date.now()-ts)/60000);if(m<1)return'adesso';if(m<60)return m+' min fa';const h=Math.round(m/60);return h<24?h+(h===1?' ora fa':' ore fa'):'ieri';}
const STATUS_IDEAS=['Sto studiando','Sto lavorando','In palestra','Pausa caffè, mi chiami?','In viaggio','A lezione','Sto cucinando','Mi manchi'];
function freshStatus(st){return st&&st.text&&Date.now()-st.at<12*3600e3?st:null;}
function statusSheet(){
  const cur=freshStatus(S.status);
  sheet(`<h2>Cosa stai facendo?</h2><p class="muted" style="text-align:center;margin-top:4px">${others.size?'Arriva come notifica sul telefono di '+esc([...others.keys()].map(nm).join(', '))+'.':'Arriverà come notifica all’altra persona appena entra nel bosco.'}</p>
  <div class="ideas">${STATUS_IDEAS.map(t=>`<button data-idea="${esc(t)}">${esc(t)}</button>`).join('')}</div>
  <label class="notelbl" for="statusIn" style="margin:12px auto 6px;display:block">Oppure scrivilo tu</label>
  <textarea id="statusIn" maxlength="120" placeholder="Es. ripasso il capitolo 4, poi ti chiamo">${esc(cur?cur.text:'')}</textarea>
  <div class="row" style="margin:12px auto 0"><button class="btn primary" data-act="sendStatus">Invia</button>${cur?'<button class="btn ghost" data-act="clearStatus">Togli lo stato</button>':''}</div>`);
}
function sendStatus(text){
  text=String(text||'').trim().slice(0,120);if(!text)return;
  S.status={text,at:Date.now()};commit();notify('status',text);toast(others.size?'Inviato a '+[...others.keys()].map(nm).join(', ')+'.':'Stato aggiornato.');
}
function autoNotify(text){if(S.settings.shareActivity!==false)notify('auto',text);}

// push subscription for this device
const standalone=()=>window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function u8(b64){b64=b64.replace(/-/g,'+').replace(/_/g,'/');while(b64.length%4)b64+='=';const s=atob(b64);const o=new Uint8Array(s.length);for(let i=0;i<s.length;i++)o[i]=s.charCodeAt(i);return o;}
let pushState='unknown';
async function pushStatus(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return standalone()?'unsupported':'install';
  if(Notification.permission==='denied')return'denied';
  try{const reg=await Promise.race([navigator.serviceWorker.ready,new Promise((_,no)=>setTimeout(no,5000))]);const sub=await reg.pushManager.getSubscription();if(sub&&Notification.permission==='granted'){saveSub(sub);return'on';}}catch(e){}
  return'off';
}
async function saveSub(sub){try{const j=sub.toJSON();await window.SB.from('push_subs').upsert({endpoint:j.endpoint,user_id:(window.SOTTOBOSCO_USER||{}).id,sub:j});}catch(e){}}
async function enablePush(){
  try{
    const perm=await Notification.requestPermission();if(perm!=='granted'){pushState=perm==='denied'?'denied':'off';renderPush();return;}
    const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(CFG.vapidPublicKey)});
    await saveSub(sub);pushState='on';renderPush();toast('Notifiche attive su questo telefono.');
  }catch(e){pushState='error';renderPush();}
}
async function disablePush(){try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub){await window.SB.from('push_subs').delete().eq('endpoint',sub.endpoint);await sub.unsubscribe();}}catch(e){}pushState='off';renderPush();}
function renderPush(){
  const box=$('#pushBox');if(!box)return;const st=S.settings;
  const msg={on:'Attive su questo telefono.',off:'Spente su questo telefono.',install:'Su iPhone le notifiche funzionano solo dall’app sulla schermata Home: apri Sottobosco da lì e torna qui.',denied:'Le hai bloccate. Riattivale da Impostazioni › Notifiche › Sottobosco.',unsupported:'Questo telefono non supporta le notifiche web. Serve iOS 16.4 o successivo.',error:'Non sono riuscito ad attivarle. Riprova tra poco.',unknown:'Controllo…'}[pushState]||'';
  box.innerHTML=`<div class="set"><div class="lbl"><b>Notifiche su questo telefono</b><small>${esc(msg)}</small></div>${pushState==='on'?'<button class="btn quiet sm" data-push="off">Spegni</button>':(pushState==='off'||pushState==='error')?'<button class="btn primary sm" data-push="on">Attiva</button>':''}</div>
  <div class="set"><div class="lbl"><b>Avvisami quando l’altra persona inizia o finisce</b><small>Pomodori e turni di lavoro. Stati e inviti arrivano sempre.</small></div><button class="switch" role="switch" aria-checked="${st.partnerAlerts!==false}" data-ptg="partnerAlerts" aria-label="Avvisi su inizio e fine"></button></div>
  <div class="set"><div class="lbl"><b>Fai sapere quando inizio o finisco</b><small>Se lo spegni, l’altra persona non riceve avvisi automatici da te.</small></div><button class="switch" role="switch" aria-checked="${st.shareActivity!==false}" data-ptg="shareActivity" aria-label="Condividi inizio e fine"></button></div>`;
}
document.addEventListener('click',e=>{
  const p=e.target.closest('[data-push]');if(p){p.dataset.push==='on'?enablePush():disablePush();return;}
  const t=e.target.closest('[data-ptg]');if(t){const k=t.dataset.ptg;S.settings[k]=S.settings[k]===false;commit();renderPush();return;}
  const i=e.target.closest('[data-idea]');if(i){const ta=$('#statusIn');if(ta){ta.value=i.dataset.idea;ta.focus();}return;}
  if(e.target.closest('#statusBtn')){statusSheet();return;}
  if(e.target.closest('[data-invite]')){sendInvite();return;}
  const acc=e.target.closest('[data-accept]');if(acc){acceptInvite(acc.dataset.accept);return;}
});
pushStatus().then(s=>{pushState=s;renderPush();});


/* ---------- audio ---------- */
let AC=null,master=null,noiseB=null,amb=null;
function ensureAudio(){try{if(!AC){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;AC=new C();master=AC.createGain();master.gain.value=S.settings.vol;master.connect(AC.destination);}if(AC.state==='suspended')AC.resume();}catch(e){return null;}return AC;}
function noise(){if(noiseB)return noiseB;const len=AC.sampleRate*3,b=AC.createBuffer(1,len,AC.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;l=(l+.02*w)/1.02;d[i]=w*.6+l*3;}noiseB=b;return b;}
function startAmbient(kind){
  stopAmbient();if(kind==='off'||!ensureAudio())return;
  const out=AC.createGain();out.gain.value=0;out.connect(master);const nodes=[];let timer=null;
  const src=()=>{const s=AC.createBufferSource();s.buffer=noise();s.loop=true;s.loopStart=Math.random();s.start(0,Math.random()*2);nodes.push(s);return s;};
  const filt=(type,f,q)=>{const b=AC.createBiquadFilter();b.type=type;b.frequency.value=f;if(q)b.Q.value=q;return b;};
  const lfo=(rate,depth,param)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=rate;g.gain.value=depth;o.connect(g);g.connect(param);o.start();nodes.push(o);};
  let target=.4;
  if(kind==='rain'){const a=src(),hp=filt('highpass',600),lp=filt('lowpass',7000);a.connect(hp);hp.connect(lp);lp.connect(out);const b=src(),lp2=filt('lowpass',500),g2=AC.createGain();g2.gain.value=.5;b.connect(lp2);lp2.connect(g2);g2.connect(out);target=.32;}
  if(kind==='brook'){const a=src(),bp=filt('bandpass',1500,1.6);a.connect(bp);bp.connect(out);lfo(.6,500,bp.frequency);const b=src(),bp2=filt('bandpass',700,2.5);b.connect(bp2);bp2.connect(out);lfo(1.3,260,bp2.frequency);target=.75;}
  if(kind==='wind'){const a=src(),bp=filt('bandpass',380,.8);a.connect(bp);bp.connect(out);lfo(.07,220,bp.frequency);const vg=AC.createGain();vg.gain.value=1;bp.disconnect();bp.connect(vg);vg.connect(out);lfo(.11,.45,vg.gain);target=.7;}
  if(kind==='crickets'){const bed=src(),lp=filt('lowpass',350),bg=AC.createGain();bg.gain.value=.25;bed.connect(lp);lp.connect(bg);bg.connect(out);
    const o=AC.createOscillator();o.frequency.value=4600;const amp=AC.createGain();amp.gain.value=.5;const gate=AC.createGain();gate.gain.value=0;o.connect(amp);amp.connect(gate);gate.connect(out);o.start();nodes.push(o);
    const l=AC.createOscillator();l.type='square';l.frequency.value=24;const lg=AC.createGain();lg.gain.value=.5;l.connect(lg);lg.connect(amp.gain);l.start();nodes.push(l);
    const chirp=()=>{const n=AC.currentTime;for(let i=0;i<2;i++){const s0=n+i*.42;gate.gain.setValueAtTime(0,s0);gate.gain.linearRampToValueAtTime(.09,s0+.04);gate.gain.setValueAtTime(.09,s0+.26);gate.gain.linearRampToValueAtTime(0,s0+.32);}};
    chirp();timer=setInterval(chirp,1300+Math.random()*500);target=.6;}
  out.gain.linearRampToValueAtTime(target,AC.currentTime+1.8);amb={out,nodes,timer};
}
function stopAmbient(){if(!amb||!AC)return;const a=amb;amb=null;clearInterval(a.timer);try{a.out.gain.cancelScheduledValues(AC.currentTime);a.out.gain.setValueAtTime(a.out.gain.value,AC.currentTime);a.out.gain.linearRampToValueAtTime(0,AC.currentTime+.5);}catch(e){}setTimeout(()=>{a.nodes.forEach(n=>{try{n.stop();}catch(e){}});try{a.out.disconnect();}catch(e){}},700);}
let previewT=null;
function previewSound(kind){clearTimeout(previewT);startAmbient(kind);if(kind!=='off')previewT=setTimeout(()=>{if(!busy(S.active))stopAmbient();},3500);}
function chime(){if(!S.settings.chime||!ensureAudio())return;const n=AC.currentTime+.05;[1046.5,1318.5,1568,2093].forEach((f,i)=>{const o=AC.createOscillator(),o2=AC.createOscillator(),g=AC.createGain(),g2=AC.createGain();o.frequency.value=f;o2.frequency.value=f*2.76;g2.gain.value=.12;const s0=n+i*.17;g.gain.setValueAtTime(0,s0);g.gain.linearRampToValueAtTime(.22,s0+.01);g.gain.exponentialRampToValueAtTime(.0005,s0+2.4);o.connect(g);o2.connect(g2);g2.connect(g);g.connect(master);o.start(s0);o2.start(s0);o.stop(s0+2.5);o2.stop(s0+2.5);});}

/* ---------- wake lock ---------- */
let wake=null;
async function lockOn(){try{if(navigator.wakeLock&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',()=>{wake=null;});}}catch(e){wake=null;}}
function lockOff(){try{if(wake)wake.release();}catch(e){}wake=null;}

/* ---------- timer ---------- */
let afterglow=null; // {sp, dead, rare} or {work, items} shown on stage after a session ends
let quoteI=Math.floor(Math.random()*QUOTES.length),lastBlock=-1;
const busy=a=>a&&(a.kind==='focus'||a.kind==='work');
function curDur(){return S.mode==='work'?LIMITS.work.max:S.settings[S.mode];}
function minFor(mode){return mode==='focus'?Math.max(LIMITS.focus.min,SP[S.sel.sp].min):LIMITS[mode].min;}
function endTs(a){return a.start+a.dur*60000;}
function start(){
  ensureAudio();const mode=S.mode;let dur=mode==='work'?WORK_CAP:curDur();if(mode==='focus'&&dur<minFor('focus')){dur=minFor('focus');S.settings.focus=dur;}
  const ni=$('#noteIn'),withNote=mode==='focus'||mode==='work',note=withNote?ni.value.trim().slice(0,120):'';if(withNote)ni.value='';
  S.active={id:uid(),kind:mode,start:Date.now(),dur,sp:S.sel.sp,tag:S.sel.tag,note};afterglow=null;lastBlock=-1;
  if(withNote)startAmbient(S.settings.sound);
  heartbeat();lockOn();scheduleEnd(S.active);commit();
  if(mode==='focus')autoNotify('Ha piantato '+artName(SP[S.sel.sp]).replace(/^U/,'u')+' · '+dur+' min'+(note?' · '+note:''));else if(mode==='work')autoNotify('Ha iniziato a lavorare con lo gnomo'+(note?': '+note:''));
}
function cancel(){if(!S.active)return;clearEnd();const w=S.active.kind==='work';S.active=null;stopAmbient();lockOff();commit();toast(w?'Annullato. Lo gnomo torna a riposare.':'Annullato. Nessuna pianta persa.');}
function giveUp(reason){
  const a=S.active;if(!a||a.kind!=='focus')return;const mins=Math.max(1,Math.round((Date.now()-a.start)/60000));
  clearEnd();S.sessions.push([a.id,a.start,mins,a.sp,a.tag,0,0,0,a.note||'',null,a.together?a.together.id:null]);markSess(a.start);S.active=null;afterglow={sp:a.sp,dead:true};stopAmbient();lockOff();commit();
  const sp=SP[a.sp];
  sheet(`<div class="result"><canvas id="resCv"></canvas><h2>${art(sp)} ${sp.n} è appassit${sp.f?'a':'o'}</h2><p class="muted">${reason||'Hai interrotto il pomodoro dopo '+mins+' min.'} Resterà nel bosco come promemoria: la prossima andrà meglio.</p><div class="row"><button class="btn primary" data-act="close">Ripianta</button></div></div>`);
  drawRes(sp,{dead:true,g:.75});
}
function skipBreak(){if(!S.active)return;clearEnd();S.active=null;S.mode='focus';lockOff();commit();}
function art(sp){return sp.f?'Una':(/^[aeiou]/i.test(sp.n)?"L'":'Un');}
function artName(sp){const a=art(sp);return a==="L'"?a+sp.n:a+' '+sp.n;}
function findBuddy(from,to){let buddy=null;others.forEach((o,id)=>{const pa=o.prof&&o.prof.active;if(busy(pa)&&pa.start<to&&endTs(pa)>from)buddy=id;Object.values(o.sess).forEach(l=>l.forEach(s=>{if(s[5]===1&&s[1]<to&&s[1]+s[2]*60000>from)buddy=id;}));});return buddy;}
function bonusLines(a,lines){
  if(!okS().some(s=>dayKey(s[1])===dayKey(a.start)))lines.push(['Primo turno del giorno',2]);
  const st=streak(a.start);if(st>=7)lines.push(['Serie di '+st+' giorni',3]);else if(st>=3)lines.push(['Serie di '+st+' giorni',1]);
}
function completeFocus(){
  const a=S.active;if(!a)return;const sp=SP[a.sp];const min=a.dur;
  S.cycle=(S.cycle||0)+1;const every=S.settings.every,cycleDone=S.cycle>=every;
  const rare=Math.random()<.07;const lines=[['Crescita · '+min+' min',Math.floor(min/5)]];
  bonusLines(a,lines);
  if(cycleDone)lines.push(['Ciclo di '+every+' pomodori completato',5]);
  if(rare)lines.push(['Fioritura dorata',10]);
  const buddy=findBuddy(a.start,Date.now());if(buddy)lines.push(['In compagnia di '+nm(buddy),3]);
  if(a.together)lines.push(['Salice di coppia con '+nm(a.together.with),5]);
  const earned=lines.reduce((x,l)=>x+l[1],0);
  clearEnd();S.sessions.push([a.id,a.start,min,a.sp,a.tag,1,rare?1:0,earned,a.note||'',null,a.together?a.together.id:null]);markSess(a.start);
  let unlockedTomato=false;if(cycleDone&&!S.unlocked.includes('tomato')){S.unlocked.push('tomato');unlockedTomato=true;}
  if(cycleDone)S.cycle=0;
  S.active=null;afterglow={sp:a.sp,rare};stopAmbient();lockOff();
  const next=cycleDone?'long':'short';S.mode=next;commit();chime();bumpSeeds();
  const nb=S.settings[next];
  sheet(`<div class="result"><canvas id="resCv"></canvas><h2>${artName(sp)} è cresciut${sp.f?'a':'o'} nel tuo bosco</h2><p class="muted">${min} minuti di concentrazione · ${TAGS[a.tag]?TAGS[a.tag].n:''}${rare?' · esemplare dorato, capita di rado':''}</p>
  <label class="notelbl" for="resNote">Cosa hai fatto?</label><textarea id="resNote" data-sid="${esc(a.id)}" maxlength="120" placeholder="Es. capitolo 3 di Storia, esercizi 1–8">${esc(a.note||'')}</textarea>
  <ul class="earn">${lines.map(l=>`<li><span>${esc(l[0])}</span><b>+${l[1]}</b></li>`).join('')}${unlockedTomato?'<li class="unlock"><span>Hai sbloccato il Pomodoro, la pianta di chi completa un ciclo</span><b>nuovo</b></li>':''}</ul>
  <div class="total">${SEED_SVG}+${earned} semi</div>
  <div class="row"><button class="btn primary" data-act="break">${next==='long'?'Pausa lunga':'Pausa'} di ${nb} min</button><button class="btn quiet" data-act="again">Un altro pomodoro</button><button class="btn ghost" data-act="garden">Guarda il bosco</button></div></div>`);
  drawRes(sp,{rare,g:1});
  autoNotify(artName(sp)+' è cresciut'+(sp.f?'a':'o')+' · '+min+' min'+(a.note?' · '+a.note:''));
}
function completeWork(){
  const a=S.active;if(!a||a.kind!=='work')return;const now=Date.now();const w=workBuilt(a,now);const min=Math.floor(w.el/60000);
  if(min<1){cancel();return;}
  const lines=[['Lavoro · '+fmtMin(min),Math.floor(min/5)]];
  if(w.built.length)lines.push(['Lavoretti dello gnomo · '+w.built.length,w.built.length]);
  bonusLines(a,lines);
  const buddy=findBuddy(a.start,Math.min(now,endTs(a)));if(buddy)lines.push(['In compagnia di '+nm(buddy),3]);
  const earned=lines.reduce((x,l)=>x+l[1],0);
  clearEnd();S.sessions.push([a.id,a.start,min,'work',a.tag,1,0,earned,a.note||'',w.built]);markSess(a.start);
  S.active=null;afterglow={work:true,items:w.built};lastBlock=-1;stopAmbient();lockOff();S.mode='short';commit();chime();bumpSeeds();
  const names=w.built.map(k=>ITEM[k].n);
  sheet(`<div class="result"><canvas id="resCv"></canvas><h2>Turno finito: ${fmtMin(min)}</h2><p class="muted">${names.length?'Lo gnomo ha aggiunto al bosco: '+esc(names.join(', '))+'.':'Il primo lavoretto arriva dopo 15 minuti: la prossima volta lo gnomo costruisce qualcosa.'}</p>
  <label class="notelbl" for="resNote">Su cosa hai lavorato?</label><textarea id="resNote" data-sid="${esc(a.id)}" maxlength="120" placeholder="Es. relazione per il cliente, mail arretrate">${esc(a.note||'')}</textarea>
  <ul class="earn">${lines.map(l=>`<li><span>${esc(l[0])}</span><b>+${l[1]}</b></li>`).join('')}</ul>
  <div class="total">${SEED_SVG}+${earned} semi</div>
  <div class="row"><button class="btn primary" data-act="break">Pausa di ${S.settings.short} min</button><button class="btn quiet" data-act="work">Torna al lavoro</button><button class="btn ghost" data-act="garden">Guarda il bosco</button></div></div>`);
  drawRes(null,{work:true,items:w.built});
  autoNotify('Ha finito il turno: '+fmtMin(min)+(w.built.length?' · lo gnomo ha costruito '+names.join(', ').toLowerCase():''));
}
function completeBreak(){clearEnd();S.active=null;S.mode='focus';lockOff();commit();chime();toast('Pausa finita. Pronto per ripartire.');}
function checkActive(){
  const a=S.active;if(!a)return;const now=Date.now();
  if(a.kind==='focus'&&S.settings.strict){let seen=0;try{seen=+localStorage.getItem(LS+'.seen')||0;}catch(e){}
    if(seen&&now-seen>15000&&endTs(a)>seen+10000&&!document.hidden){giveUp('Hai lasciato Sottobosco per più di 10 secondi in modalità rigorosa.');return;}}
  if(a.kind==='work'){const b=Math.floor((Math.min(now,endTs(a))-a.start)/BLOCK_MS);if(lastBlock>=0&&b>lastBlock&&!document.hidden){toast('Lo gnomo ha finito: '+ITEM[itemFor(a.id,b-1)].n+'. Ne inizia un altro.');softChime();}lastBlock=b;}
  if(now>=endTs(a)){a.kind==='focus'?completeFocus():a.kind==='work'?completeWork():completeBreak();}
}
function softChime(){if(!S.settings.chime||!ensureAudio())return;const n=AC.currentTime+.03;[784,1046.5].forEach((f,i)=>{const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;const s0=n+i*.12;g.gain.setValueAtTime(0,s0);g.gain.linearRampToValueAtTime(.12,s0+.01);g.gain.exponentialRampToValueAtTime(.0005,s0+1.2);o.connect(g);g.connect(master);o.start(s0);o.stop(s0+1.3);});}
function heartbeat(){try{localStorage.setItem(LS+'.seen',String(Date.now()));}catch(e){}}
let hiddenAt=0;
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();heartbeat();return;}
  if(S.active&&S.active.kind==='focus'&&S.settings.strict&&hiddenAt&&Date.now()-hiddenAt>10000&&endTs(S.active)>hiddenAt+10000){hiddenAt=0;giveUp('Hai lasciato Sottobosco per più di 10 secondi in modalità rigorosa.');return;}
  hiddenAt=0;heartbeat();if(AC&&AC.state==='suspended')AC.resume();if(S.active)lockOn();lastBlock=-1;checkActive();renderFocus();
});
setInterval(()=>{if(S.active){if(!document.hidden)heartbeat();checkActive();renderClock();}},250);
setInterval(()=>{quoteI=(quoteI+1)%QUOTES.length;if(S.active&&S.active.kind==='focus')renderClock();},45000);

/* ---------- UI helpers ---------- */
const SEED_SVG='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3c4 4 6 7.4 6 10.6A6 6 0 0 1 12 20a6 6 0 0 1-6-6.4C6 10.4 8 7 12 3Z"/></svg>';
let toastT=null;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600);}
function bumpSeeds(){const p=$('#seedPill');p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump');}
function sheet(html){$('#sheet').innerHTML='<div class="grab"></div>'+html;$('#scrim').hidden=false;}
function closeSheet(){$('#scrim').hidden=true;$('#sheet').innerHTML='';}
function drawRes(sp,o){requestAnimationFrame(()=>{const cv=$('#resCv');if(!cv)return;const c=fitCanvas(cv,200,200);let t0=performance.now();const loop=now=>{if(!document.body.contains(cv))return;const t=(now-t0)/1000;c.clearRect(0,0,200,200);if(o.work){island(c,100,160,66);workScene(c,100,160,245,t+1,{built:o.items,act:'wave'});}else{island(c,100,168,66);drawPlant(c,sp,100,166,118,o.g,t+1,{dead:o.dead,rare:o.rare,anim:true});}requestAnimationFrame(loop);};requestAnimationFrame(loop);});}
function saveSheetNotes(){document.querySelectorAll('#sheet textarea[data-sid]').forEach(t=>setNote(t.dataset.sid,t.value));}
$('#scrim').addEventListener('click',e=>{if(e.target.id==='scrim'){saveSheetNotes();closeSheet();return;}const b=e.target.closest('[data-act]');if(!b)return;const act=b.dataset.act;saveSheetNotes();
  if(act==='close'){closeSheet();}
  if(act==='break'){closeSheet();start();}
  if(act==='again'){closeSheet();S.mode='focus';commit();}
  if(act==='work'){closeSheet();S.mode='work';afterglow=null;commit();}
  if(act==='garden'){closeSheet();S.mode='focus';commit();show('garden');}
  if(act==='sp'){const k=b.dataset.k;if(!S.unlocked.includes(k)){closeSheet();show('shop');return;}S.sel.sp=k;if(S.settings.focus<SP[k].min)S.settings.focus=SP[k].min;afterglow=null;closeSheet();commit();}
  if(act==='sendStatus'){const t=$('#statusIn');sendStatus(t?t.value:'');closeSheet();}
  if(act==='clearStatus'){S.status=null;commit();closeSheet();toast('Stato tolto.');}
  if(act==='tag'){S.sel.tag=+b.dataset.i;closeSheet();commit();}
});

/* ---------- views ---------- */
let view='focus';
function show(v){view=v;document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='v-'+v);document.querySelectorAll('#tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.v===v));$('#main').scrollTop=0;renderView();}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)show(b.dataset.v);});
function renderAll(){checkTogether();checkFauna();renderHeader();renderView();renderSync();resolveNames();}
function renderView(){if(view==='focus')renderFocus();if(view==='garden')renderGarden();if(view==='shop')renderShop();if(view==='stats')renderStats();}
function renderHeader(){$('#seedN').textContent=seeds();$('#streakN').textContent=streak();}

// dial
const dial=$('#dial'),stageEl=$('#stage');
function buildTicks(){const L=LIMITS[S.mode],n=Math.round(L.max/L.step);const step=n>30?2:1;let h='';for(let i=0;i<n;i+=step){const a=i/n*TAU-Math.PI/2;const big=(i*L.step)%(S.mode==='focus'?30:5)===0;const r1=big?122:126,r2=130;h+=`<line x1="${150+Math.cos(a)*r1}" y1="${150+Math.sin(a)*r1}" x2="${150+Math.cos(a)*r2}" y2="${150+Math.sin(a)*r2}" stroke="var(--track)" stroke-width="${big?2.2:1.4}" stroke-linecap="round"/>`;}$('#ticks').innerHTML=h;}
let lastTickMode='';
function fmtClock(sec){sec=Math.max(0,Math.ceil(sec));const m=Math.floor(sec/60),s=sec%60;return(m<10?'0':'')+m+':'+(s<10?'0':'')+s;}
function fmtUp(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return(h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(s).padStart(2,'0');}
const ringCol=k=>k==='focus'?'var(--accent)':k==='work'?'var(--pollen)':'var(--sky)';
function renderClock(){
  const a=S.active,ring=$('#ringProg'),knob=$('#knob');
  if(a&&a.kind==='work'){const now=Date.now(),w=workBuilt(a,now);$('#time').textContent=fmtUp(w.el/1000);ring.setAttribute('stroke-dashoffset',String(100-w.prog*100));ring.setAttribute('stroke',ringCol('work'));knob.style.display='none';
    const left=Math.max(1,Math.ceil((BLOCK_MS-w.el%BLOCK_MS)/60000));
    $('#sub').textContent=w.el<10000?'Hai 10 secondi per annullare.':'Lo gnomo costruisce: '+ITEM[w.cur].n+' · pronto tra '+left+' min'+(w.built.length?' · '+w.built.length+' già fatti':'');
    $('#ghostBtn').hidden=w.el>=10000;document.title=fmtUp(w.el/1000)+' · Sottobosco';}
  else if(a){const total=a.dur*60,left=(endTs(a)-Date.now())/1000;$('#time').textContent=fmtClock(left);const frac=clamp(left/total);ring.setAttribute('stroke-dashoffset',String(100-frac*100));knob.style.display='none';
    ring.setAttribute('stroke',ringCol(a.kind));
    const el=Date.now()-a.start;$('#sub').textContent=a.kind==='focus'?(el<10000?'Hai 10 secondi per annullare senza perdere la pianta.':QUOTES[quoteI]):'Alzati, bevi un bicchiere d’acqua, guarda lontano.';
    if(a.kind==='focus'){$('#ghostBtn').hidden=el>=10000;$('#holdBtn').hidden=el<10000;}
    document.title=fmtClock(left)+' · Sottobosco';
  }else if(S.mode==='work'){$('#time').textContent='00:00';ring.setAttribute('stroke-dashoffset','100');knob.style.display='none';
    $('#sub').textContent='Lavora quanto ti serve: ogni 15 minuti lo gnomo aggiunge qualcosa al bosco. Puoi usare il telefono, qui non appassisce niente.';document.title='Sottobosco';}
  else{const L=LIMITS[S.mode],d=curDur(),frac=d/L.max;$('#time').textContent=fmtClock(d*60);ring.setAttribute('stroke-dashoffset',String(100-frac*100));ring.setAttribute('stroke',ringCol(S.mode));
    knob.style.display='';const ang=frac*TAU-Math.PI/2;knob.setAttribute('cx',150+Math.cos(ang)*140);knob.setAttribute('cy',150+Math.sin(ang)*140);knob.setAttribute('stroke',ringCol(S.mode));
    dial.setAttribute('aria-valuemin',minFor(S.mode));dial.setAttribute('aria-valuemax',L.max);dial.setAttribute('aria-valuenow',d);dial.setAttribute('aria-valuetext',d+' minuti');
    const sp=SP[S.sel.sp];$('#sub').textContent=S.mode==='focus'?(sp.min>10&&d<=sp.min?sp.n+': almeno '+sp.min+' minuti per crescere.':'Trascina l’anello per scegliere la durata'):'Una pausa vera fa crescere meglio il prossimo pomodoro.';
    document.title='Sottobosco';}
}
function renderFocus(){
  const a=S.active,mode=a?a.kind:S.mode;
  if(lastTickMode!==mode){S.mode=mode;buildTicks();lastTickMode=mode;}
  document.querySelectorAll('#modes button').forEach(b=>{b.setAttribute('aria-selected',b.dataset.mode===mode);b.disabled=!!a;});
  stageEl.classList.toggle('idle',!a&&mode!=='work');
  const sp=SP[a&&SP[a.sp]?a.sp:S.sel.sp];
  $('#spChipN').textContent=sp.n;thumb($('#spChipCv'),sp,{scale:.95});
  const tg=TAGS[a?a.tag:S.sel.tag]||TAGS[0];$('#tagN').textContent=tg.n;$('#tagSw').style.background=tg.c;
  $('#sndN').textContent=(SOUNDS.find(x=>x[0]===S.settings.sound)||SOUNDS[0])[1];
  $('#spChip').disabled=!!a;$('#tagChip').disabled=!!a;
  const withNote=mode==='focus'||mode==='work';
  $('#spChip').hidden=mode!=='focus';$('#tagChip').hidden=!withNote;
  const main=$('#mainBtn'),ghost=$('#ghostBtn'),hold=$('#holdBtn');
  if(!a){main.hidden=false;main.textContent=mode==='focus'?'Pianta':mode==='work'?'Inizia a lavorare':'Inizia la pausa';hold.hidden=true;ghost.hidden=withNote;ghost.textContent='Salta la pausa';}
  else if(a.kind==='focus'){main.hidden=true;ghost.textContent='Annulla';}
  else if(a.kind==='work'){main.hidden=false;main.textContent='Fine turno';hold.hidden=true;ghost.textContent='Annulla';}
  else{main.hidden=true;hold.hidden=true;ghost.hidden=false;ghost.textContent='Termina la pausa';}
  const ni=$('#noteIn');ni.hidden=!!a||!withNote;ni.placeholder=mode==='work'?'Su cosa lavori in questo turno?':'Cosa farai in questo pomodoro?';
  const ns=$('#noteShow');ns.hidden=!(busy(a)&&a.note);if(!ns.hidden)ns.textContent=a.note;
  renderPartners();
  $('#cycle').hidden=mode!=='focus';
  const every=S.settings.every,done=S.cycle||0;let h='';for(let i=0;i<every;i++)h+=`<i class="${i<done?'on':''}"></i>`;$('#cycle').innerHTML=h+`<span>pomodoro ${Math.min(done+1,every)} di ${every}</span>`;
  renderClock();
}
$('#modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||S.active)return;S.mode=b.dataset.mode;afterglow=null;commit();});
$('#mainBtn').addEventListener('click',()=>{if(S.active&&S.active.kind==='work')completeWork();else if(!S.active)start();});
$('#noteIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();}});
$('#ghostBtn').addEventListener('click',()=>{const a=S.active;if(!a){S.mode='focus';commit();return;}if(busy(a))cancel();else skipBreak();});
// hold to give up
(function(){const b=$('#holdBtn');let t=null;const down=e=>{e.preventDefault();b.classList.add('holding');t=setTimeout(()=>{b.classList.remove('holding');giveUp();},1300);};const up=()=>{b.classList.remove('holding');clearTimeout(t);};
  b.addEventListener('pointerdown',down);['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,up));
  b.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.repeat&&!b.classList.contains('holding'))down(e);});b.addEventListener('keyup',up);
  b.addEventListener('contextmenu',e=>e.preventDefault());})();
// dial drag
(function(){let drag=false;
  const setFrom=e=>{const r=dial.getBoundingClientRect();const x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;let a=Math.atan2(x,-y);if(a<0)a+=TAU;const L=LIMITS[S.mode];let v=Math.round(a/TAU*L.max/L.step)*L.step;v=clamp(v,minFor(S.mode),L.max);
    if(v!==S.settings[S.mode]){S.settings[S.mode]=v;renderClock();}};
  dial.addEventListener('pointerdown',e=>{if(S.active||S.mode==='work')return;const r=dial.getBoundingClientRect();const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;if(Math.hypot(dx,dy)<r.width*.3)return;drag=true;stageEl.classList.add('dragging');dial.setPointerCapture(e.pointerId);setFrom(e);});
  dial.addEventListener('pointermove',e=>{if(drag)setFrom(e);});
  const end=()=>{if(!drag)return;drag=false;stageEl.classList.remove('dragging');commit();};
  dial.addEventListener('pointerup',end);dial.addEventListener('pointercancel',end);
  dial.addEventListener('keydown',e=>{if(S.active||S.mode==='work')return;const L=LIMITS[S.mode];let d=0;if(e.key==='ArrowRight'||e.key==='ArrowUp')d=L.step;if(e.key==='ArrowLeft'||e.key==='ArrowDown')d=-L.step;if(!d)return;e.preventDefault();S.settings[S.mode]=clamp(curDur()+d,minFor(S.mode),L.max);commit();});
})();
$('#spChip').addEventListener('click',()=>{
  sheet(`<h2>Cosa vuoi far crescere?</h2><div class="pick">${SPECIES.filter(sp=>sp.req!=='together').map(sp=>{const u=S.unlocked.includes(sp.k);return`<button data-act="sp" data-k="${sp.k}" aria-pressed="${S.sel.sp===sp.k}" class="${u?'':'locked'}"><canvas data-th="${sp.k}"></canvas>${sp.n}<small>${u?(sp.min>10?'da '+sp.min+' min':'da 10 min'):(sp.req?'completa un ciclo':sp.price+' semi')}</small></button>`;}).join('')}</div>`);
  requestAnimationFrame(()=>document.querySelectorAll('#sheet canvas[data-th]').forEach(cv=>thumb(cv,SP[cv.dataset.th])));
});
$('#tagChip').addEventListener('click',()=>{sheet(`<h2>A cosa stai lavorando?</h2><div class="list">${TAGS.map((t,i)=>`<button data-act="tag" data-i="${i}" aria-pressed="${S.sel.tag===i}"><span class="sw" style="background:${t.c}"></span>${t.n}</button>`).join('')}</div>`);});
$('#sndChip').addEventListener('click',()=>{const i=SOUNDS.findIndex(x=>x[0]===S.settings.sound);const next=SOUNDS[(i+1)%SOUNDS.length][0];S.settings.sound=next;commit();if(busy(S.active))startAmbient(next);else previewSound(next);});

// stage animation
const stageCv=$('#stageCv');let stageCtx=null,stageW=0;
function sizeStage(){const r=stageCv.getBoundingClientRect();if(!r.width)return;stageW=r.width;stageCtx=fitCanvas(stageCv,r.width,r.width);}
function frame(now){
  requestAnimationFrame(frame);if(view!=='focus'||document.hidden)return;if(!stageCtx||Math.abs(stageCv.getBoundingClientRect().width-stageW)>1)sizeStage();if(!stageCtx)return;
  const c=stageCtx,W=stageW,t=now/1000;c.clearRect(0,0,W,W);
  const bx=W/2,by=W*.72;
  c.save();c.beginPath();c.arc(W/2,W/2,W*.43,0,TAU);c.clip();if(isNight()){c.fillStyle='rgba(12,24,48,.28)';c.fillRect(0,0,W,W);}
  island(c,bx,by,W*.27);
  const a=S.active;
  try{drawStage(c,W,bx,by,t,a);}finally{weather(c,W*.07,W*.07,W*.86,W*.86,t,18);c.restore();}
}
function drawStage(c,W,bx,by,t,a){
  if(a&&a.kind==='work'){const w=workBuilt(a,Date.now());workScene(c,bx,by,W,t,{built:w.built,cur:w.cur,prog:w.prog,act:ITEM[w.cur].tool});return;}
  if(!a&&afterglow&&afterglow.work){workScene(c,bx,by,W,t,{built:afterglow.items,act:'wave'});return;}
  if(!a&&S.mode==='work'){workScene(c,bx,by,W,t,{built:[],act:'idle'});return;}
  let sp,g=1,o={anim:true};
  if(a&&a.kind==='focus'){sp=SP[a.sp];g=clamp((Date.now()-a.start)/(a.dur*60000));}
  else if(afterglow&&afterglow.sp){sp=SP[afterglow.sp];o.dead=afterglow.dead;o.rare=afterglow.rare;g=afterglow.dead?.75:1;}
  else{sp=SP[S.sel.sp];g=1;}
  drawPlant(c,sp,bx,by-2,W*.44,g,t,o);
  if(a&&!busy(a)&&!REDUCED){butterfly(c,bx+Math.sin(t*.7)*W*.22,by-W*.38+Math.sin(t*1.6)*W*.06,t,W*.022);}
}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{stageCtx=null;if(view==='garden')renderGarden();});

// garden
let gP='day',gOff=0,gPlaced=[];
function periodRange(p,off){const d=new Date();d.setHours(0,0,0,0);let a,b,label;const fmt=(x,o)=>x.toLocaleDateString('it-IT',o);
  if(p==='day'){d.setDate(d.getDate()+off);a=+d;const e=new Date(d);e.setDate(e.getDate()+1);b=+e;label=off===0?'Oggi':off===-1?'Ieri':fmt(d,{weekday:'long',day:'numeric',month:'long'});}
  else if(p==='week'){const wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd+off*7);a=+d;const e=new Date(d);e.setDate(e.getDate()+7);b=+e;const last=new Date(e);last.setDate(last.getDate()-1);label=off===0?'Questa settimana':fmt(d,{day:'numeric',month:'short'})+' – '+fmt(last,{day:'numeric',month:'short'});}
  else if(p==='month'){d.setDate(1);d.setMonth(d.getMonth()+off);a=+d;const e=new Date(d);e.setMonth(e.getMonth()+1);b=+e;label=fmt(d,{month:'long',year:'numeric'});label=label[0].toUpperCase()+label.slice(1);}
  else{a=0;b=Infinity;label='Da sempre';}
  return{a,b,label};}
$('#gSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;gP=b.dataset.p;gOff=0;renderGarden();});
$('#gPrev').addEventListener('click',()=>{gOff--;renderGarden();});
$('#gNext').addEventListener('click',()=>{if(gOff<0){gOff++;renderGarden();}});
function fmtMin(m){if(m<60)return m+' min';const h=Math.floor(m/60),r=m%60;return h+' h'+(r?' '+r:'');}
let gWho='all',gRows=[];
const isWork=s=>s[3]==='work';
function allItems(){const me=myId||'me';const out=S.sessions.map(s=>({s,o:me}));others.forEach((o,id)=>Object.keys(o.sess).forEach(k=>o.sess[k].forEach(s=>out.push({s,o:id}))));return out.sort((x,y)=>x.s[1]-y.s[1]);}
function ownerColor(id){return isMine(id)?'#2f8f5b':(colors[id]||'#d4517a');}
$('#gWho').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;gWho=b.dataset.w;renderGarden();});
function renderGarden(){
  document.querySelectorAll('#gSeg button').forEach(b=>b.setAttribute('aria-selected',b.dataset.p===gP));
  const R=periodRange(gP,gOff);$('#gLabel').textContent=R.label;$('#gPrev').disabled=gP==='all';$('#gNext').disabled=gP==='all'||gOff>=0;
  const shared=others.size>0;$('#gTitle').textContent=shared?'Il vostro bosco':'Il tuo bosco';
  const who=$('#gWho');who.hidden=!shared;
  if(shared){if(gWho!=='all'&&gWho!=='me'&&!others.has(gWho))gWho='all';
    who.innerHTML=[['all','Insieme'],['me','Tu'],...[...others.keys()].map(id=>[id,nm(id)])].map(([k,l])=>`<button role="tab" data-w="${esc(k)}" aria-selected="${gWho===k}">${k==='all'?'':`<span class="who"><i style="background:${esc(ownerColor(k))}"></i></span> `}${esc(l)}</button>`).join('');}
  else gWho='all';
  const all=allItems();const pick=x=>gWho==='all'||(gWho==='me'?isMine(x.o):x.o===gWho);
  const items=all.filter(x=>x.s[1]>=R.a&&x.s[1]<R.b&&pick(x));const ok=items.filter(x=>x.s[5]===1);
  $('#gsPlants').textContent=ok.filter(x=>!isWork(x.s)).length;$('#gsTime').textContent=fmtMin(ok.reduce((t,x)=>t+x.s[2],0));$('#gsWork').textContent=items.reduce((t,x)=>t+(isWork(x.s)?(x.s[9]||[]).length:0),0);
  const totP=all.filter(x=>x.s[5]===1&&!isWork(x.s)).length,totW=all.reduce((t,x)=>t+(isWork(x.s)?(x.s[9]||[]).length:0),0);
  $('#gCount').textContent=totP+(totP===1?' pianta':' piante')+(totW?' e '+totW+(totW===1?' lavoretto':' lavoretti'):'')+' in tutto';
  $('#gEmpty').hidden=items.length>0;$('#gTip').hidden=true;
  renderLog(items,shared);
  // what stands on the meadow: one plant per pomodoro, one object per finished gnome job
  const ents=[];items.forEach(x=>{if(isWork(x.s))(x.s[9]||[]).forEach((k,i)=>{if(ITEM[k])ents.push({type:'item',key:k,s:x.s,o:x.o,ts:x.s[1]+i*BLOCK_MS});});else ents.push({type:'plant',s:x.s,o:x.o,ts:x.s[1]});});
  ents.sort((a,b)=>a.ts-b.ts);
  const now=Date.now();const working=[];if(S.active&&S.active.kind==='work'&&pick({o:myId||'me'}))working.push(myId||'me');others.forEach((o,id)=>{const a=o.prof&&o.prof.active;if(a&&a.kind==='work'&&endTs(a)>now&&pick({o:id}))working.push(id);});
  const showLive=gOff===0?working:[];
  const cv=$('#gCv'),W=$('#meadow').clientWidth;if(!W)return;
  const n=Math.max(gP==='day'?4:gP==='week'?5:6,Math.ceil(Math.sqrt(ents.length+showLive.length)));
  const tw=Math.max(44,Math.min(84,(W-28)/n)),th=tw/2,depth=Math.max(10,tw*.22),top=tw*1.15+10;const H=top+n*th+depth+16,CW=Math.max(W,Math.ceil(n*tw+28));
  const c=fitCanvas(cv,CW,H);cv.style.height=H+'px';cv.style.width=CW+'px';c.clearRect(0,0,CW,H);const ox=CW/2,oy=top;
  const cap=n*n,used0=ents.length+showLive.length;$('#gGrow').textContent=gP==='all'||used0>cap*.6?`Prato ${n}×${n} · ${used0} di ${cap} caselle occupate`+(used0>=cap*.8?' · tra poco si allarga':''):'';
  const L=[ox-n*tw/2,oy+n*th/2],B=[ox,oy+n*th],Rr=[ox+n*tw/2,oy+n*th/2];
  c.fillStyle='#7a5638';c.beginPath();c.moveTo(L[0],L[1]);c.lineTo(B[0],B[1]);c.lineTo(B[0],B[1]+depth);c.lineTo(L[0],L[1]+depth);c.fill();
  c.fillStyle='#5f412b';c.beginPath();c.moveTo(B[0],B[1]);c.lineTo(Rr[0],Rr[1]);c.lineTo(Rr[0],Rr[1]+depth);c.lineTo(B[0],B[1]+depth);c.fill();
  c.fillStyle='#6fa34f';c.beginPath();c.moveTo(L[0],L[1]);c.lineTo(B[0],B[1]);c.lineTo(B[0],B[1]+depth*.25);c.lineTo(L[0],L[1]+depth*.25);c.fill();
  c.fillStyle='#5e9243';c.beginPath();c.moveTo(B[0],B[1]);c.lineTo(Rr[0],Rr[1]);c.lineTo(Rr[0],Rr[1]+depth*.25);c.lineTo(B[0],B[1]+depth*.25);c.fill();
  const rnd=rng(n*131+(R.a%997));const greens=GRASS[season()];
  const cells=[];for(let i=0;i<n;i++)for(let j=0;j<n;j++){const x=ox+(i-j)*tw/2,y=oy+(i+j)*th/2;c.fillStyle=greens[Math.floor(rnd()*4)];c.beginPath();c.moveTo(x,y);c.lineTo(x+tw/2,y+th/2);c.lineTo(x,y+th);c.lineTo(x-tw/2,y+th/2);c.closePath();c.fill();c.strokeStyle='rgba(60,100,40,.12)';c.lineWidth=1;c.stroke();cells.push({i,j,x,y:y+th/2,d:Math.pow(i-(n-1)/2,2)+Math.pow(j-(n-1)/2,2)+rnd()*.8});}
  const order=cells.slice().sort((p,q)=>p.d-q.d);gPlaced=[];
  ents.forEach((e,k)=>{const cell=order[k];if(cell)gPlaced.push(Object.assign({cell},e));});
  showLive.forEach((id,k)=>{const cell=order[ents.length+k];if(cell)gPlaced.push({cell,type:'gnome',o:id});});
  {const free=order.slice(ents.length+showLive.length).reverse();faunaNow().forEach((k,i)=>{const cell=free[(i*3)%Math.max(1,free.length)];if(cell&&!gPlaced.some(p=>p.cell===cell))gPlaced.push({cell,type:'animal',key:k});});}
  const used=new Set(gPlaced.map(p=>p.cell));const SEAS=season();
  cells.forEach(cell=>{if(used.has(cell))return;const r=rnd();if(r<.35){c.strokeStyle='#5f9443';c.lineWidth=1.2;c.lineCap='round';const gx=cell.x+(rnd()-.5)*tw*.3,gy=cell.y+(rnd()-.5)*th*.3;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx-2,gy-6);c.moveTo(gx,gy);c.lineTo(gx+2,gy-7);c.moveTo(gx,gy);c.lineTo(gx+4,gy-4);c.stroke();}
    else if(r<.45){oval(c,cell.x+(rnd()-.5)*tw*.3,cell.y,tw*.06,tw*.035,0,'#b8b2a2');}
    else if(r<.55&&SEAS!=='winter'){const fx=cell.x+(rnd()-.5)*tw*.3,fy=cell.y;stem(c,fx,fy,fx,fy-tw*.1,0,1,'#5f9443');dot(c,fx,fy-tw*.1,tw*.025,['#f6e27a','#f4f1ea','#d9a7e0'][Math.floor(rnd()*3)]);}
    else if(r<.7&&SEAS==='autumn'){for(let q=0;q<3;q++)oval(c,cell.x+(rnd()-.5)*tw*.5,cell.y+(rnd()-.5)*th*.4,tw*.035,tw*.018,rnd()*3,['#d98b2b','#b8661f','#e2a640'][q]);}
    else if(r<.75&&SEAS==='winter'){oval(c,cell.x+(rnd()-.5)*tw*.3,cell.y,tw*.18,th*.14,0,'rgba(255,255,255,.75)');}
    else if(r<.68&&SEAS==='spring'){const fx=cell.x+(rnd()-.5)*tw*.3,fy=cell.y;stem(c,fx,fy,fx,fy-tw*.09,0,1,'#5f9443');dot(c,fx,fy-tw*.09,tw*.03,'#f6bccb');}});
  gPlaced.slice().sort((p,q)=>(p.cell.i+p.cell.j)-(q.cell.i+q.cell.j)).forEach(p=>{const{cell}=p;
    if(p.type!=='item'||!ITEM[p.key].flat)oval(c,cell.x,cell.y+1,tw*.2,th*.18,0,'rgba(40,60,30,.18)');
    if(shared&&gWho==='all'&&p.type!=='gnome'){c.strokeStyle=ownerColor(p.o);c.lineWidth=2;c.beginPath();c.ellipse(cell.x,cell.y+1,tw*.24,th*.24,0,0,TAU);c.stroke();}
    if(p.type==='plant'){const s=p.s,sp=SP[s[3]]||SP.daisy;drawPlant(c,sp,cell.x,cell.y,tw*(.72+.5*clamp(s[2]/120)),s[5]?1:.75,1.3+cell.i,{dead:!s[5],rare:!!s[6]});}
    else if(p.type==='item')drawItem(c,p.key,cell.x,cell.y,tw*(ITEM[p.key].flat?.95:.8),1,1+cell.i);
    else if(p.type==='animal')drawAnimal(c,p.key,cell.x,cell.y,tw*.55,1+cell.i);
    else drawGnome(c,cell.x,cell.y,tw*.6,1.5,'hoe');});
  if(isNight()){c.fillStyle='rgba(12,24,48,.22)';c.fillRect(0,0,CW,H);const rf=rng(99);for(let q=0;q<Math.min(14,4+gPlaced.length);q++)glow(c,ox+(rf()-.5)*n*tw*.8,oy+rf()*n*th,tw*.22,.5);}
  if(CW>W){const m=$('#meadow');if(m.dataset.c!==gP+gOff+CW){m.dataset.c=gP+gOff+CW;m.scrollLeft=(CW-W)/2;}}
}
function plantLabel(s){if(isWork(s))return'Turno di lavoro';const sp=SP[s[3]]||SP.daisy,e=sp.f?'a':'o';return sp.n+(s[6]?' dorat'+e:'')+(s[5]?'':' appassit'+e);}
function workLine(s){const it=(s[9]||[]).map(k=>ITEM[k]?ITEM[k].n:'').filter(Boolean);return it.length?'Lo gnomo ha costruito: '+it.join(', '):'Troppo breve per un lavoretto';}
function renderLog(items,shared){
  gRows=items.slice().sort((x,y)=>y.s[1]-x.s[1]).slice(0,80);
  $('#gLogH').hidden=!gRows.length;
  $('#gLog').innerHTML=gRows.map((r,i)=>{const s=r.s,mine=isMine(r.o),d=new Date(s[1]);const tg=TAGS[s[4]];
    const when=(gP==='day'?'':d.toLocaleDateString('it-IT',{day:'numeric',month:'short'})+' · ')+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
    const sub=s[8]?esc(s[8]):(isWork(s)?esc(workLine(s)):(mine?'Tocca per scrivere cosa hai fatto':'Nessuna nota'));
    return`<button data-log="${i}"><canvas data-lt="${i}"></canvas><div style="min-width:0"><div class="t">${esc(plantLabel(s))} · ${fmtMin(s[2])}</div><div class="n ${s[8]||isWork(s)?'':'empty-n'}">${sub}</div></div><div class="m">${when}<br>${shared?`<span class="who"><i style="background:${esc(ownerColor(r.o))}"></i>${esc(nm(r.o))}</span>`:esc(tg?tg.n:'')}</div></button>`;}).join('');
  requestAnimationFrame(()=>document.querySelectorAll('#gLog canvas[data-lt]').forEach(cv=>{const r=gRows[+cv.dataset.lt];if(!r)return;const s=r.s;if(isWork(s))thumbGnome(cv);else thumb(cv,SP[s[3]]||SP.daisy,{scale:.9,g:s[5]?1:.75,dead:!s[5],rare:!!s[6]});}));
}
function noteSheet(r){
  const s=r.s,mine=isMine(r.o),d=new Date(s[1]);const tg=TAGS[s[4]];const work=isWork(s);
  const meta=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})+' alle '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})+(tg?' · '+tg.n:'')+(others.size?' · '+nm(r.o):'');
  sheet(`<div class="result"><canvas id="resCv"></canvas><h2>${esc(plantLabel(s))} · ${fmtMin(s[2])}</h2><p class="muted">${esc(meta)}</p>${work?`<p class="notero">${esc(workLine(s))}</p>`:''}${mine
    ?`<label class="notelbl" for="noteEdit">${work?'Su cosa hai lavorato?':'Cosa hai fatto?'}</label><textarea id="noteEdit" data-sid="${esc(s[0])}" maxlength="120" placeholder="Es. capitolo 3 di Storia, esercizi 1–8">${esc(s[8]||'')}</textarea><div class="row"><button class="btn primary" data-act="close">Salva</button></div>`
    :`<p class="notero">${s[8]?esc(s[8]):'Nessuna nota.'}</p><div class="row"><button class="btn quiet" data-act="close">Chiudi</button></div>`}</div>`);
  if(work)drawRes(null,{work:true,items:s[9]||[]});else drawRes(SP[s[3]]||SP.daisy,{dead:!s[5],rare:!!s[6],g:s[5]?1:.75});
}
$('#gLog').addEventListener('click',e=>{const b=e.target.closest('[data-log]');if(!b)return;const r=gRows[+b.dataset.log];if(r)noteSheet(r);});
$('#gCv').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;let best=null,bd=1e9;gPlaced.forEach(p=>{const d=Math.hypot(p.cell.x-x,(p.cell.y-y)*.8-10);if(d<bd){bd=d;best=p;}});const tip=$('#gTip');
  if(!best||bd>60){tip.hidden=true;return;}let txt;
  if(best.type==='animal'){const an=ANIMAL[best.key];txt=an.n+' · vive nel bosco · '+an.hint.toLowerCase();}
  else if(best.type==='gnome')txt=(isMine(best.o)?'Il tuo gnomo':'Lo gnomo di '+nm(best.o))+' sta lavorando adesso';
  else{const s=best.s,d=new Date(s[1]);const when=d.toLocaleDateString('it-IT',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
    txt=(others.size?nm(best.o)+' · ':'')+(best.type==='item'?ITEM[best.key].n+' · costruito durante un turno di '+fmtMin(s[2]):plantLabel(s)+' · '+s[2]+' min'+(s[10]&&s[3]==='willow'?' · insieme':''))+' · '+when+(s[8]?' · '+s[8]:'');}
  tip.textContent=txt;tip.style.left=clamp(best.cell.x,90,r.width-90)+'px';tip.style.top=(best.cell.y-12)+'px';tip.hidden=false;});

// shop
function renderShop(){
  const have=seeds(),counts={};okS().forEach(s=>counts[s[3]]=(counts[s[3]]||0)+1);
  $('#shop').innerHTML=SPECIES.map(sp=>{const u=S.unlocked.includes(sp.k);let meta;
    if(sp.req==='together')meta=counts[sp.k]?`<span class="tag-ok">${counts[sp.k]} cresciut${counts[sp.k]===1?'o':'i'} insieme</span>`:'<span>Cresce solo con un pomodoro insieme</span>';
    else if(u)meta=`<span class="tag-ok">${S.sel.sp===sp.k?'Selezionata':'Nel tuo vivaio'}</span><span>${counts[sp.k]||0} cresciut${sp.f?'e':'i'}</span>`;
    else if(sp.req)meta=`<span>Si sblocca completando un ciclo di ${S.settings.every} pomodori</span>`;
    else meta=`<button class="buy" data-buy="${sp.k}" ${have<sp.price?'disabled':''}>${SEED_SVG}${sp.price}</button><span>${sp.min>10?'min '+sp.min+' min':''}</span>`;
    const shown=u||(sp.req==='together'&&counts[sp.k]);
    return`<div class="sp ${shown?'':'locked'} ${S.sel.sp===sp.k?'sel':''}" ${u?`data-use="${sp.k}" role="button" tabindex="0"`:''}><canvas data-th="${sp.k}"></canvas><h3>${sp.n}</h3><p class="lat">${sp.l}</p><div class="meta">${meta}</div></div>`;}).join('');
  const built={};S.sessions.forEach(s=>{if(s[3]==='work')(s[9]||[]).forEach(k=>built[k]=(built[k]||0)+1);});
  const when=['dal primo quarto d’ora','dopo 30 minuti di turno','dopo 45 minuti di turno'];
  $('#crafts').innerHTML=ITEMS.map(it=>{const n=built[it.k]||0;return`<div class="sp ${n?'':'locked'}"><canvas data-it="${it.k}"></canvas><h3>${it.n}</h3><div class="meta">${n?`<span class="tag-ok">Costruito ${n===1?'una volta':n+' volte'}</span>`:`<span>Arriva ${when[it.tier]}</span>`}</div></div>`;}).join('');
  const fauna=faunaNow(),z=forestStats();
  $('#fauna').innerHTML=ANIMALS.map(an=>{const has=fauna.includes(an.k);return`<div class="sp ${has?'':'locked'}"><canvas data-an="${an.k}"></canvas><h3>${an.n}</h3><div class="meta">${has?'<span class="tag-ok">Vive nel bosco</span>':`<span>${an.hint}</span>`}</div></div>`;}).join('');
  requestAnimationFrame(()=>{document.querySelectorAll('#fauna canvas[data-an]').forEach(cv=>{const rr=cv.getBoundingClientRect();const w=rr.width||120,hh=rr.height||108;const cc=fitCanvas(cv,w,hh);drawAnimal(cc,cv.dataset.an,w/2,hh*.85,Math.min(w,hh)*.9,1);});document.querySelectorAll('#shop canvas[data-th]').forEach(cv=>thumb(cv,SP[cv.dataset.th],{scale:.8}));document.querySelectorAll('#crafts canvas[data-it]').forEach(cv=>thumbItem(cv,cv.dataset.it));});
}
$('#shop').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b){const sp=SP[b.dataset.buy];if(seeds()>=sp.price&&!S.unlocked.includes(sp.k)){S.unlocked.push(sp.k);S.sel.sp=sp.k;if(S.settings.focus<sp.min)S.settings.focus=sp.min;commit();bumpSeeds();toast(sp.n+' sbloccat'+(sp.f?'a':'o')+'. È pronta da piantare.');}return;}
  const u=e.target.closest('[data-use]');if(u&&!S.active){S.sel.sp=u.dataset.use;const sp=SP[S.sel.sp];if(S.settings.focus<sp.min)S.settings.focus=sp.min;S.mode='focus';afterglow=null;commit();show('focus');}});
$('#shop').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.use)e.target.click();});

// stats
function renderStats(){
  const ok=okS(),today=dayKey(Date.now());const tMin=ok.filter(s=>dayKey(s[1])===today).reduce((x,s)=>x+s[2],0);const tot=ok.reduce((x,s)=>x+s[2],0);const st=streak();
  $('#stToday').textContent=fmtMin(tMin);$('#stStreak').textContent=st+(st===1?' giorno':' giorni');$('#stTotal').textContent=tot<60?tot+' min':(tot/60).toFixed(tot<600?1:0).replace('.',',')+' h';$('#stPlants').textContent=ok.filter(s=>s[3]!=='work').length;
  $('#statSince').textContent=S.sessions.length?'Dal '+new Date(S.sessions[0][1]).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'}):'Il primo pomodoro apre il diario.';
  // chart
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);days.push({d,k:dayKey(d),m:0});}
  ok.forEach(s=>{const x=days.find(d=>d.k===dayKey(s[1]));if(x)x.m+=s[2];});
  const mx=Math.max(60,Math.ceil(Math.max(...days.map(d=>d.m))/60)*60);const sum=days.reduce((x,d)=>x+d.m,0);$('#stWeek').textContent=fmtMin(sum)+' in tutto';
  const X0=34,X1=314,Y0=140,Y1=16,bw=(X1-X0)/7;let h='';
  [0,.5,1].forEach(f=>{const y=Y0-(Y0-Y1)*f;h+=`<line x1="${X0}" x2="${X1}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1" ${f?'stroke-dasharray="3 4"':''}/><text x="${X0-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--muted)">${fmtShort(mx*f)}</text>`;});
  days.forEach((d,i)=>{const bh=(Y0-Y1)*d.m/mx,x=X0+i*bw+bw*.2,w=bw*.6;const isT=i===6;if(d.m>0)h+=`<rect x="${x}" y="${Y0-bh}" width="${w}" height="${bh}" rx="5" fill="${isT?'var(--accent)':'var(--accent)'}" opacity="${isT?1:.55}"/>`;if(d.m>0)h+=`<text x="${x+w/2}" y="${Y0-bh-5}" text-anchor="middle" font-size="10" fill="var(--ink)" style="font-variant-numeric:tabular-nums">${d.m}</text>`;
    h+=`<text x="${x+w/2}" y="${Y0+16}" text-anchor="middle" font-size="11" fill="${isT?'var(--ink)':'var(--muted)'}" font-weight="${isT?600:400}">${d.d.toLocaleDateString('it-IT',{weekday:'short'}).slice(0,3)}</text>`;});
  $('#chart').innerHTML=h;
  // tags
  const since=Date.now()-30*864e5,tm=TAGS.map(()=>0);ok.filter(s=>s[1]>=since).forEach(s=>{if(tm[s[4]]!=null)tm[s[4]]+=s[2];});const tmx=Math.max(1,...tm);
  const rows=TAGS.map((t,i)=>({t,m:tm[i]})).filter(r=>r.m>0).sort((a,b)=>b.m-a.m);
  $('#tagStats').innerHTML=rows.length?rows.map(r=>`<div class="tagrow"><span>${r.t.n}</span><span class="bar"><i style="width:${r.m/tmx*100}%;background:${r.t.c}"></i></span><span class="v">${fmtMin(r.m)}</span></div>`).join(''):'<p class="small muted">Scegli un’etichetta prima di piantare e qui vedrai come si divide il tuo tempo.</p>';
  renderSettings();renderShare();renderPush();
}
function renderShare(){
  const ids=[...others.keys()];
  $('#shareTxt').textContent=!DB?'Non riesco a collegarmi al bosco condiviso: per ora salvo tutto su questo telefono.'
    :ids.length?'Le vostre piante crescono nello stesso prato. Ognuno ha i propri semi e la propria serra, e un pomodoro fatto nello stesso momento vale 3 semi in più a testa.'
    :'Quando l’altra persona crea il suo account con l’email invitata, le sue piante compaiono qui accanto alle tue.';
  $('#members').innerHTML=[myId,...ids].filter(Boolean).map(id=>`<span>${avatars[id]?`<img alt="" src="${esc(avatars[id])}">`:`<i style="width:10px;height:10px;border-radius:50%;margin-left:6px;background:${esc(ownerColor(id))}"></i>`}${esc(nm(id))}</span>`).join('');
}
function fmtShort(m){return m>=60?(m/60).toString().replace('.',',')+'h':Math.round(m)+'m';}
function renderSettings(){
  const st=S.settings;
  $('#settings').innerHTML=`
  <div class="set"><div class="lbl"><b>Pausa corta</b><small>Dopo ogni pomodoro</small></div><div class="stepper"><button data-st="short" data-d="-1" aria-label="Meno">−</button><output>${st.short} min</output><button data-st="short" data-d="1" aria-label="Più">+</button></div></div>
  <div class="set"><div class="lbl"><b>Pausa lunga</b><small>Alla fine di ogni ciclo</small></div><div class="stepper"><button data-st="long" data-d="-5" aria-label="Meno">−</button><output>${st.long} min</output><button data-st="long" data-d="5" aria-label="Più">+</button></div></div>
  <div class="set"><div class="lbl"><b>Pomodori per ciclo</b><small>Un ciclo completo vale 5 semi extra</small></div><div class="stepper"><button data-st="every" data-d="-1" aria-label="Meno">−</button><output>${st.every}</output><button data-st="every" data-d="1" aria-label="Più">+</button></div></div>
  <div class="set"><div class="lbl"><b>Modalità rigorosa</b><small>Se esci dalla pagina per più di 10 secondi la pianta appassisce. Anche bloccare lo schermo conta come uscire.</small></div><button class="switch" role="switch" aria-checked="${st.strict}" data-tg="strict" aria-label="Modalità rigorosa"></button></div>
  <div class="set"><div class="lbl"><b>Campanella</b><small>Suona quando un pomodoro o una pausa finiscono</small></div><button class="switch" role="switch" aria-checked="${st.chime}" data-tg="chime" aria-label="Campanella"></button></div>
  <div class="set"><div class="lbl"><b>Volume</b><small>Suoni d’ambiente e campanella</small></div><input type="range" id="volR" min="0" max="1" step="0.05" value="${st.vol}" aria-label="Volume"></div>`;
}
$('#settings').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.st){const k=b.dataset.st,d=+b.dataset.d;const lim=k==='every'?{min:2,max:8}:LIMITS[k];S.settings[k]=clamp(S.settings[k]+d,lim.min,lim.max);if(k==='every'&&S.cycle>=S.settings.every)S.cycle=S.settings.every-1;commit();}
  if(b.dataset.tg){const k=b.dataset.tg;S.settings[k]=!S.settings[k];commit();if(k==='chime'&&S.settings.chime)chime();}});
$('#settings').addEventListener('input',e=>{if(e.target.id==='volR'){S.settings.vol=+e.target.value;if(master)master.gain.value=S.settings.vol;}});
$('#settings').addEventListener('change',e=>{if(e.target.id==='volR'){commit();chime();}});
function renderSync(){const n=$('#syncNote');if(!n)return;n.innerHTML=syncState==='ok'?'Il bosco è salvato nel tuo account ('+esc((window.SOTTOBOSCO_USER||{}).email||'')+'): lo ritrovi su ogni dispositivo.':syncState==='err'?'Non riesco a salvare nel tuo account in questo momento. I dati restano su questo dispositivo e riprovo alla prossima modifica.':'Il tuo bosco è salvato su questo dispositivo.';}
$('#resetBox').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='resetBtn'){$('#resetBox').innerHTML='<p class="small" style="margin-bottom:8px">Sicuro? Piante, semi e statistiche spariscono per sempre.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn quiet" id="resetNo" style="min-width:0;min-height:40px">Tieni tutto</button><button class="btn hold" id="resetYes" style="min-width:0;min-height:40px"><span>Cancella</span></button></div>';return;}
  if(b.id==='resetNo'){$('#resetBox').innerHTML='<button class="btn ghost danger" id="resetBtn" style="padding:0;min-height:30px">Cancella tutti i dati</button>';return;}
  if(b.id==='resetYes'){S.sessions.forEach(s=>markSess(s[1]));S=defaultState();S.resetAt=Date.now();afterglow=null;stopAmbient();commit();$('#resetBox').innerHTML='<button class="btn ghost danger" id="resetBtn" style="padding:0;min-height:30px">Cancella tutti i dati</button>';toast('Fatto. Si riparte da un prato.');}});

/* ---------- boot ---------- */
checkActive();
if(S.active)lockOn();
renderAll();
})();
