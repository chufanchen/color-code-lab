// 纯计算引擎：枚举密码、编码反馈、过滤候选并选择 minimax 试探。
// 可在浏览器、Worker 或 Node.js 中使用，独立于游戏的隐藏答案。
(function(root){
  'use strict';
  const codes=[];
  for(let a=0;a<7;a++)for(let b=0;b<7;b++)for(let c=0;c<7;c++)for(let d=0;d<7;d++)if(new Set([a,b,c,d]).size===4)codes.push([a,b,c,d]);
  const all=codes.map((_,i)=>i),matrices={},cache=new Map();
  function feedback(secret,guess,mode){
    const mask=secret.reduce((m,c)=>m|(1<<c),0);let exact=0,white=0,position=0,power=1;
    for(let i=0;i<4;i++){const hit=secret[i]===guess[i],present=Boolean(mask&(1<<guess[i]));exact+=hit;white+=present&&!hit;position+=(hit?2:present?1:0)*power;power*=3;}
    return mode==='beginner'?position:exact*5+white;
  }
  function fromScore(result,mode){return mode==='advanced'?result.exact*5+result.misplaced:result.positions.reduce((sum,t,i)=>sum+({correct:2,misplaced:1,absent:0}[t])*3**i,0);}
  function validGuess(g){return Array.isArray(g)&&g.length===4&&g.every(c=>Number.isInteger(c)&&c>=0&&c<7)&&new Set(g).size===4;}
  function group(ids,guess,mode){
    if(!validGuess(guess))throw new Error('需要四种不同的有效颜色。');
    const groups=new Map();
    for(const id of ids){const f=feedback(codes[id],guess,mode);if(!groups.has(f))groups.set(f,[]);groups.get(f).push(id);}
    return [...groups].map(([key,ids])=>({key,ids})).sort((a,b)=>b.ids.length-a.ids.length||a.key-b.key);
  }
  function trace(history,mode){let remaining=all.slice();const stages=[];
    for(const h of history){const branches=group(remaining,h.guess,mode),actual=fromScore(h.score,mode);const selected=branches.find(b=>b.key===actual);if(!selected)throw new Error('提示与历史记录不一致。');stages.push({guess:[...h.guess],before:remaining.length,branches,actual});remaining=selected.ids;}
    return {stages,remaining};
  }
  function matrix(mode){if(matrices[mode])return matrices[mode];const m=new Uint8Array(840*840);for(let g=0;g<840;g++)for(let s=0;s<840;s++)m[g*840+s]=feedback(codes[s],codes[g],mode);matrices[mode]=m;return m;}
  function recommend(ids,mode){
    if(!['beginner','advanced'].includes(mode)||!Array.isArray(ids)||!ids.length||ids.some(i=>!Number.isInteger(i)||i<0||i>=840))throw new Error('无效的候选集合或模式。');
    const key=mode+':'+ids.join(',');if(cache.has(key))return cache.get(key);
    if(ids.length===1){const result={guess:[...codes[ids[0]]],worst:1,isCandidate:true};cache.set(key,result);return result;}
    const m=matrix(mode),members=new Set(ids);let best=-1,bestWorst=Infinity,bestTie=2;
    for(let g=0;g<840;g++){const counts=new Uint16Array(81);let worst=0;for(const id of ids){worst=Math.max(worst,++counts[m[g*840+id]]);if(worst>bestWorst)break;}const tie=members.has(g)?0:1;if(worst<bestWorst||worst===bestWorst&&tie<bestTie){best=g;bestWorst=worst;bestTie=tie;}}
    const result={guess:[...codes[best]],worst:bestWorst,isCandidate:members.has(best)};cache.set(key,result);return result;
  }
  const api={codes,all,feedback,fromScore,validGuess,group,trace,recommend};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.DecisionCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
