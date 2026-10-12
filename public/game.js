// 游戏控制器：管理输入、计分、胜负和公开对局快照。
// 决策树只接收历史猜测及公开反馈；不传递隐藏密码。
'use strict';
const COLORS = [
  {name:'红',css:'var(--red)'},{name:'橙',css:'var(--orange)'},{name:'黄',css:'var(--yellow)'},
  {name:'绿',css:'var(--green)'},{name:'蓝',css:'var(--blue)'},{name:'紫',css:'var(--purple)'},{name:'青',css:'var(--cyan)'}
];
function score(secret,guess){
  const exact=guess.filter((c,i)=>c===secret[i]).length;
  const total=guess.filter(c=>secret.includes(c)).length;
  return {exact,misplaced:total-exact,absent:4-total,positions:guess.map((c,i)=>c===secret[i]?'correct':secret.includes(c)?'misplaced':'absent')};
}
function makeSecret(){
  const pool=COLORS.map((_,i)=>i);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,4);
}
function validGuess(guess){return Array.isArray(guess)&&guess.length===4&&guess.every(n=>Number.isInteger(n)&&n>=0&&n<7)&&new Set(guess).size===4;}
if(typeof module!=='undefined'&&module.exports)module.exports={score,makeSecret,validGuess};
if(typeof document!=='undefined'){
  const $=id=>document.getElementById(id);
  let state={mode:'beginner',secret:makeSecret(),history:[],draft:[null,null,null,null],selected:0,status:'playing'};
  let pendingMode='beginner';
  const tree=typeof DecisionTree!=='undefined'?DecisionTree.mount({
    getSnapshot:()=>({mode:state.mode,status:state.status,history:state.history.map(h=>({guess:[...h.guess],score:{...h.score,positions:[...h.score.positions]}})),draft:[...state.draft]}),
    fillGuess:guess=>{if(state.status!=='playing'||!validGuess(guess))return;state.draft=[...guess];state.selected=0;render();$('submit').focus();}
  }):null;
  const labels={correct:'颜色和位置都正确',misplaced:'颜色正确但位置错误',absent:'密码中没有这个颜色'};
  const symbols={correct:'✓',misplaced:'↔',absent:'×'};
  const colorStyle=c=>c===null?'':`style="--color:${COLORS[c].css}"`;
  const colorLabel=c=>c===null?'空位':`${COLORS[c].name}色`;
  $('draft').innerHTML=Array.from({length:4},(_,i)=>`<button class="slot" data-slot="${i}"><span class="slot-index">${i+1}</span><span class="slot-value">+</span></button>`).join('');
  $('palette').innerHTML=COLORS.map((c,i)=>`<button class="color-choice" data-color="${i}" style="--color:${c.css}" aria-label="选择${c.name}色，快捷键 ${i+1}"><span class="color-chip">${i+1}</span><span class="color-name">${c.name}</span></button>`).join('');
  function render(){
    const ended=state.status!=='playing',round=Math.min(state.history.length+1,7);
    $('round-counter').innerHTML=`${String(round).padStart(2,'0')} <span>/ 07</span>`;
    $('secret-label').textContent=ended?'正确密码':'隐藏密码';
    $('secret').setAttribute('aria-label',ended?'正确密码：'+state.secret.map(c=>COLORS[c].name).join('、'):'密码尚未揭晓');
    $('secret').innerHTML=state.secret.map(c=>`<div class="secret-peg${ended?' filled':''}" ${ended?colorStyle(c):''}>${ended?c+1:'?'}</div>`).join('');
    $('secret-caption').textContent=ended?'已揭晓':'猜对后揭晓';
    $('feedback-heading').textContent=state.mode==='beginner'?'逐格提示':'数量提示';
    $('rows').innerHTML=Array.from({length:7},(_,i)=>{
      const past=state.history[i],current=!ended&&i===state.history.length,guess=past?past.guess:current?state.draft:[null,null,null,null];
      const pegs=guess.map(c=>`<span class="peg${c!==null?' filled':''}" ${colorStyle(c)} aria-label="${colorLabel(c)}">${c!==null?c+1:''}</span>`).join('');
      let feedback='<div class="feedback pending" aria-label="尚未验证">'+Array(4).fill('<span class="pending-light"></span>').join('')+'</div>';
      if(past){
        const types=state.mode==='beginner'?past.score.positions:[...Array(past.score.exact).fill('correct'),...Array(past.score.misplaced).fill('misplaced'),...Array(past.score.absent).fill('absent')];
        feedback=`<div class="feedback ${state.mode==='advanced'?'advanced':''}" aria-label="${past.score.exact} 个完全正确，${past.score.misplaced} 个颜色正确但位置错误，${past.score.absent} 个颜色不存在">`+types.map(t=>`<span class="light ${t}" title="${labels[t]}">${symbols[t]}</span>`).join('')+'</div>';
      }
      return `<div class="row ${current?'current':!past?'future':''} ${past?.score.exact===4?'won':''}" aria-label="第 ${i+1} 次猜测${current?'，当前轮次':''}"><span class="row-number">${String(i+1).padStart(2,'0')}</span><div class="pegs">${pegs}</div>${feedback}</div>`;
    }).join('');
    document.querySelectorAll('[data-slot]').forEach((el,i)=>{
      const c=state.draft[i];el.className=`slot${c!==null?' filled':''}${state.selected===i&&!ended?' selected':''}`;
      el.style.setProperty('--color',c===null?'transparent':COLORS[c].css);
      el.querySelector('.slot-value').textContent=c===null?'+':c+1;
      el.setAttribute('aria-label',`第 ${i+1} 格：${colorLabel(c)}${state.selected===i?'，当前选中':''}`);
      el.setAttribute('aria-pressed',String(i===state.selected));el.disabled=ended;
    });
    document.querySelectorAll('[data-color]').forEach((el,i)=>{el.classList.toggle('used',state.draft.includes(i));el.disabled=ended;});
    const count=state.draft.filter(c=>c!==null).length;
    $('submit').disabled=!ended&&count!==4;
    $('submit').innerHTML=ended?'再玩一局':`提交猜测 <span>${count} / 4</span>`;
    $('clear').disabled=ended||count===0;
    $('entry-title').textContent=ended?(state.status==='won'?'解码成功':'本局结束'):`第 ${round} 次猜测`;
    $('selection-helper').textContent=ended?'新的密码，等你来挑战。':'点击色块填入，点击格子可修改。';
    $('beginner').setAttribute('aria-pressed',String(state.mode==='beginner'));
    $('advanced').setAttribute('aria-pressed',String(state.mode==='advanced'));
    $('mode-caption').textContent=state.mode==='beginner'?'适合入门':'挑战推理';
    $('mode-rule').textContent=state.mode==='beginner'?'初级模式：每盏灯对应左侧同一位置的颜色。':'高级模式：提示只代表数量，不对应左侧的具体位置。';
    $('message').classList.toggle('end',ended);
    if(ended){
      $('message').textContent=state.status==='won'?`漂亮！你用 ${state.history.length} 次猜测破解了密码。`:'7 次机会用完了。答案已经揭晓，下一局再试试。';
      $('board-status').textContent=state.status==='won'?`${state.history.length} / 7 次 · 解码成功`:'本局结束 · 正确答案见上方';
    }else{
      $('board-status').textContent=state.history.length?`还剩 ${7-state.history.length} 次机会，继续推理。`:'轮到你了，组合第一个猜测。';
      const last=state.history.at(-1);
      $('message').textContent=count===4?'组合已就绪，提交后查看提示。':last?`上次：${last.score.exact} 个完全正确，${last.score.misplaced} 个颜色正确但位置错误。`:'选满 4 种不同颜色，即可验证。';
    }
    tree?.update();
  }
  function chooseColor(c){
    if(state.status!=='playing')return;
    const duplicate=state.draft.indexOf(c),old=state.draft[state.selected];
    if(duplicate!==-1&&duplicate!==state.selected)state.draft[duplicate]=old;
    state.draft[state.selected]=c;
    const empty=state.draft.findIndex((n,i)=>n===null&&i>state.selected);
    const anyEmpty=state.draft.indexOf(null);
    state.selected=empty!==-1?empty:anyEmpty!==-1?anyEmpty:(state.selected+1)%4;
    render();
  }
  function submitGuess(guess=state.draft){
    if(state.status!=='playing')throw new Error('本局已结束，请开始新局。');
    if(!validGuess(guess))throw new Error('请选择 4 种不同的有效颜色。');
    const result=score(state.secret,guess);
    state.history.push({guess:[...guess],score:result});
    if(result.exact===4)state.status='won';else if(state.history.length===7)state.status='lost';
    if(state.status==='playing'){state.draft=[...guess];state.selected=0;}else state.draft=[...guess];
    render();return {round:state.history.length,...result,status:state.status};
  }
  function newGame(mode=state.mode){
    if(!['beginner','advanced'].includes(mode))throw new Error('模式必须为 beginner 或 advanced。');
    state={mode,secret:makeSecret(),history:[],draft:[null,null,null,null],selected:0,status:'playing'};render();
    return {mode,status:state.status,attemptsRemaining:7};
  }
  function requestNewGame(mode=state.mode){
    if(state.status==='playing'&&(state.history.length||state.draft.some(c=>c!==null))){pendingMode=mode;$('restart-dialog').showModal();}else newGame(mode);
  }
  $('draft').addEventListener('click',e=>{const btn=e.target.closest('[data-slot]');if(btn&&state.status==='playing'){state.selected=Number(btn.dataset.slot);render();}});
  $('palette').addEventListener('click',e=>{const btn=e.target.closest('[data-color]');if(btn)chooseColor(Number(btn.dataset.color));});
  $('clear').addEventListener('click',()=>{state.draft=[null,null,null,null];state.selected=0;render();});
  $('submit').addEventListener('click',()=>{if(state.status!=='playing')newGame();else if(validGuess(state.draft))submitGuess();});
  $('new-game').addEventListener('click',()=>requestNewGame());
  ['beginner','advanced'].forEach(mode=>$(mode).addEventListener('click',()=>{if(mode!==state.mode)requestNewGame(mode);}));
  $('cancel-restart').addEventListener('click',()=>$('restart-dialog').close());
  $('confirm-restart').addEventListener('click',()=>{$('restart-dialog').close();newGame(pendingMode);});
  document.addEventListener('keydown',e=>{
    if($('restart-dialog').open||e.ctrlKey||e.metaKey||e.altKey||state.status!=='playing')return;
    if(/^[1-7]$/.test(e.key)){e.preventDefault();chooseColor(Number(e.key)-1);}
    else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.selected=(state.selected+(e.key==='ArrowRight'?1:3))%4;render();document.querySelector(`[data-slot="${state.selected}"]`).focus();}
    else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();state.draft[state.selected]=null;render();}
    else if(e.key==='Enter'&&(e.target===document.body||e.target.closest('[data-color]')||e.target.closest('[data-slot]'))&&validGuess(state.draft)){e.preventDefault();submitGuess();}
  });
  const context=document.modelContext;
  if(context?.registerTool){
    const lifecycle=new AbortController();
    const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
    register({name:'read_code_game',description:'读取当前模式、历史猜测及反馈。游戏结束前不会返回隐藏密码。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({mode:state.mode,status:state.status,attemptsRemaining:7-state.history.length,history:state.history.map(h=>({colors:h.guess.map(c=>COLORS[c].name),exact:h.score.exact,misplaced:h.score.misplaced,...(state.mode==='beginner'?{positions:h.score.positions}:{})})),...(state.status!=='playing'?{answer:state.secret.map(c=>COLORS[c].name)}:{})})});
    register({name:'submit_code_guess',description:'提交一次四种不同颜色的猜测，消耗一次机会并更新棋盘。颜色编号 1–7 分别为红、橙、黄、绿、蓝、紫、青。',inputSchema:{type:'object',properties:{colors:{type:'array',items:{type:'integer',minimum:1,maximum:7},minItems:4,maxItems:4,uniqueItems:true}},required:['colors'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!Array.isArray(input.colors))throw new Error('需要四个颜色编号。');const g=input.colors.map(c=>typeof c==='number'?c-1:NaN);if(!validGuess(g))throw new Error('请选择四个不同的 1–7 颜色编号。');const r=submitGuess(g);return {round:r.round,exact:r.exact,misplaced:r.misplaced,status:r.status,...(state.mode==='beginner'?{positions:r.positions}:{})};}});
    register({name:'start_new_code_game',description:'开始一局新的随机密码游戏，会清空当前猜测记录。',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['beginner','advanced']}},required:['mode'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>newGame(input?.mode)});
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  render();
}
