// 决策树界面：展示实际路径、可能反馈、候选分页和模拟探索。
// 异步结果通过 revision 检查，避免旧局结果覆盖当前局。
(function(root){
  'use strict';
  root.DecisionTree={mount({getSnapshot,fillGuess}){
    const Core=root.DecisionCore,$=id=>document.getElementById(id);
    const colors=['红','橙','黄','绿','蓝','紫','青'],css=['red','orange','yellow','green','blue','purple','cyan'];
    let signature='',revision=0,current=null,next=null,previewKind='recommendation',branchMap=new Map(),branchSerial=0,inspection=null,sequence=0,worker=null,pending=new Map();
    try{if(typeof Worker!=='undefined'){worker=new Worker('decision-worker.js');worker.onmessage=e=>{const p=pending.get(e.data.id);if(p){pending.delete(e.data.id);e.data.error?p.reject(new Error(e.data.error)):p.resolve(e.data.result);}};worker.onerror=()=>{worker.terminate();worker=null;for(const p of pending.values())p.reject(new Error('计算暂时不可用，请重新尝试。'));pending.clear();};}}catch{}
    function calculate(ids,mode){if(worker)return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,ids,mode});});return new Promise((resolve,reject)=>setTimeout(()=>{try{resolve(Core.recommend(ids,mode));}catch(e){reject(e);}},0));}
    const pegs=g=>`<span class="mini-pegs" aria-label="${g.map(c=>colors[c]).join('、')}">${g.map(c=>`<span style="--color:var(--${css[c]})">${c+1}</span>`).join('')}</span>`;
    function feedbackText(key,mode){if(mode==='advanced')return `${Math.floor(key/5)} 绿 · ${key%5} 白`;return Array.from({length:4},(_,i)=>['灰','白','绿'][Math.floor(key/(3**i))%3]).join(' · ');}
    function lights(key,mode){const types=mode==='advanced'?[...Array(Math.floor(key/5)).fill(2),...Array(key%5).fill(1),...Array(4-Math.floor(key/5)-key%5).fill(0)]:Array.from({length:4},(_,i)=>Math.floor(key/(3**i))%3);return `<span class="branch-lights" aria-hidden="true">${types.map(t=>`<i class="light ${['absent','misplaced','correct'][t]}">${['×','↔','✓'][t]}</i>`).join('')}</span>`;}
    function branchButton(b,mode,actual=false,preview=false){const id=String(++branchSerial);branchMap.set(id,{ids:b.ids,mode,label:feedbackText(b.key,mode),preview});return `<button class="branch-node ${actual?'actual-branch':''} ${preview?'preview-branch':''}" data-branch="${id}">${lights(b.key,mode)}<span class="branch-caption">${feedbackText(b.key,mode)}</span><strong>${b.ids.length}<small> 个候选</small></strong>${actual?'<span class="path-label">实际反馈</span>':''}</button>`;}
    function alternatives(branches,mode,actual){const others=branches.filter(b=>b.key!==actual);return others.length?`<details class="other-branches"><summary><strong>${others.length}</strong> 种其他反馈<span>共 ${others.reduce((s,b)=>s+b.ids.length,0)} 个候选</span></summary><div class="alternative-grid">${others.map(b=>branchButton(b,mode)).join('')}</div></details>`:'<div class="no-alternatives">只有这一种反馈</div>';}
    function renderTree(){
      if(!current)return;branchMap=new Map();branchSerial=0;
      const snap=getSnapshot(),mode=snap.mode,remaining=current.remaining;
      let html=`<div class="tree-root"><span>开始</span><strong>840 <small>个可能密码</small></strong></div>`;
      current.stages.forEach((s,i)=>{const b=s.branches.find(b=>b.key===s.actual);html+=`<div class="tree-stage"><div class="guess-node"><span>第 ${i+1} 次猜测</span>${pegs(s.guess)}<small>此前 ${s.before} 个候选</small></div><div class="tree-fork">${branchButton(b,mode,true)}${alternatives(s.branches,mode,s.actual)}</div></div>`;});
      if(snap.status==='won')html+='<div class="terminal-node">✓ 解码成功</div>';
      else if(snap.status==='lost')html+=`<div class="terminal-node ended-node">机会用完 · 剩余 ${remaining.length} 个候选</div>`;
      else if(next){const groups=Core.group(remaining,next.guess,mode);html+=`<div class="tree-stage preview-stage"><div class="guess-node"><span>${previewKind==='draft'?'你的猜测预览':remaining.length===1?'答案已确定':'建议下一次试探'}</span>${pegs(next.guess)}<small>${remaining.length===1?'提交这个组合即可猜中':`最坏剩余 ${next.worst} 个候选`}</small></div><button class="fill-suggestion" id="fill-suggestion">填入这个组合</button><details class="preview-outcomes" open><summary>${groups.length} 种可能反馈</summary><div class="alternative-grid">${groups.map(b=>branchButton(b,mode,false,true)).join('')}</div></details></div>`;}
      else html+='<div class="computing-node" role="status">正在寻找下一次试探…</div>';
      $('tree-canvas').innerHTML=html;
      const fill=$('fill-suggestion');if(fill)fill.addEventListener('click',()=>{fillGuess(next.guess);document.getElementById('draft').scrollIntoView?.({behavior:'smooth',block:'center'});});
    }
    function showInspector(){
      if(!inspection)return;const el=$('tree-inspector'),node=inspection;
      el.hidden=false;
      const list=node.ids.slice(node.offset,node.offset+12);
      const crumb=node.path.length?`<div class="explore-breadcrumb">${node.path.map(p=>`${p.guess.map(c=>c+1).join('')}：${p.label}`).join(' / ')}</div>`:'';
      el.innerHTML=`<div class="inspector-header"><h4>${node.path.length?'模拟分支':'分支详情'}</h4><button class="text-button" id="close-inspector">关闭</button></div>${crumb}<p>${node.label} · <strong>${node.ids.length} 个候选</strong></p><div class="candidate-list">${list.map(id=>`<div>${pegs(Core.codes[id])}</div>`).join('')}</div><div class="candidate-pagination"><button class="text-button" id="candidates-prev" ${node.offset===0?'disabled':''}>上一页</button><span>${node.offset+1}–${Math.min(node.offset+12,node.ids.length)} / ${node.ids.length}</span><button class="text-button" id="candidates-next" ${node.offset+12>=node.ids.length?'disabled':''}>下一页</button></div>${node.path.length?'<button id="explore-back" class="text-button">返回上一层</button>':''}<div id="explore-next">${node.recommendation?exploreMarkup(node):'<button id="expand-branch" class="quiet-button">'+(node.ids.length===1?'查看已确定答案':'展开下一层试探')+'</button>'}</div><p class="inspector-note">模拟探索，不代表实际密码，也不会提交猜测。</p>`;
      $('close-inspector').addEventListener('click',()=>{inspection=null;el.hidden=true;});
      $('candidates-prev').addEventListener('click',()=>{node.offset=Math.max(0,node.offset-12);showInspector();});
      $('candidates-next').addEventListener('click',()=>{node.offset=Math.min(node.offset+12,Math.floor((node.ids.length-1)/12)*12);showInspector();});
      $('explore-back')?.addEventListener('click',()=>{inspection=node.parent;showInspector();});
      $('expand-branch')?.addEventListener('click',async()=>{const token=revision;const btn=$('expand-branch');btn.disabled=true;btn.textContent='正在计算…';try{const result=await calculate(node.ids,node.mode);if(token!==revision||inspection!==node)return;node.recommendation=result;showInspector();}catch(e){if(inspection===node){btn.disabled=false;btn.textContent='重新计算';}}});
      $('tree-inspector').querySelectorAll('[data-explore]').forEach(btn=>btn.addEventListener('click',()=>{const b=Core.group(node.ids,node.recommendation.guess,node.mode).find(b=>String(b.key)===btn.dataset.explore);inspection={ids:b.ids,mode:node.mode,label:feedbackText(b.key,node.mode),path:[...node.path,{guess:node.recommendation.guess,label:feedbackText(b.key,node.mode)}],offset:0,parent:node};showInspector();}));
    }
    function exploreMarkup(node){const r=node.recommendation;return `<div class="explore-guess"><span>${node.ids.length===1?'此分支答案':'建议试探'}</span>${pegs(r.guess)}<small>最坏剩余 ${r.worst} 个候选</small></div>${node.ids.length===1?'':`<div class="alternative-grid">${Core.group(node.ids,r.guess,node.mode).map(b=>`<button class="branch-node preview-branch" data-explore="${b.key}">${lights(b.key,node.mode)}<span class="branch-caption">${feedbackText(b.key,node.mode)}</span><strong>${b.ids.length}<small> 个候选</small></strong></button>`).join('')}</div>`}`;}
    $('tree-canvas').addEventListener('click',e=>{const btn=e.target.closest('[data-branch]');if(!btn)return;const b=branchMap.get(btn.dataset.branch);if(!b)return;inspection={...b,path:[],offset:0};showInspector();$('tree-inspector').scrollIntoView?.({behavior:'smooth',block:'nearest'});});
    $('preview-draft').addEventListener('click',()=>{const snap=getSnapshot();if(snap.status!=='playing'||!Core.validGuess(snap.draft))return;previewKind='draft';const groups=Core.group(current.remaining,snap.draft,snap.mode);next={guess:[...snap.draft],worst:Math.max(...groups.map(b=>b.ids.length))};renderTree();});
    $('preview-recommendation').addEventListener('click',()=>{if(getSnapshot().status==='playing'){previewKind='recommendation';refreshRecommendation();}});
    async function refreshRecommendation(){const token=revision;next=null;renderTree();try{const r=await calculate(current.remaining,getSnapshot().mode);if(token!==revision||previewKind!=='recommendation')return;next=r;renderTree();}catch(e){if(token===revision)$('tree-canvas').innerHTML+='<p class="tree-error">建议计算暂时不可用；历史路径和候选数量仍可查看。</p>';}}
    function update(){
      const snap=getSnapshot();$('preview-draft').disabled=snap.status!=='playing'||!Core.validGuess(snap.draft);$('preview-recommendation').disabled=snap.status!=='playing';
      const nextSignature=JSON.stringify([snap.mode,snap.status,snap.history]);
      if(nextSignature===signature){if(previewKind==='draft'&&snap.status==='playing'){if(Core.validGuess(snap.draft)){const groups=Core.group(current.remaining,snap.draft,snap.mode);next={guess:[...snap.draft],worst:Math.max(...groups.map(b=>b.ids.length))};renderTree();}else{previewKind='recommendation';refreshRecommendation();}}return;}
      signature=nextSignature;revision++;previewKind='recommendation';next=null;inspection=null;$('tree-inspector').hidden=true;
      current=Core.trace(snap.history,snap.mode);$('candidate-count').textContent=current.remaining.length;
      const before=current.stages.at(-1)?.before??840,removed=before-current.remaining.length;
      $('tree-summary').textContent=snap.history.length?`第 ${snap.history.length} 次反馈排除了 ${removed} 个候选，剩余 ${current.remaining.length} 个。`:'还没有猜测。从 840 个可能密码开始。';
      renderTree();if(snap.status==='playing')refreshRecommendation();
    }
    root.addEventListener?.('pagehide',()=>worker?.terminate(),{once:true});
    return {update};
  }};
})(typeof globalThis!=='undefined'?globalThis:this);
