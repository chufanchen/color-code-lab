const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path=require('node:path');
const base=path.resolve(__dirname,'../public')+path.sep;
const Core=require(base+'decision.js'),Game=require(base+'game.js');
assert.equal(Core.codes.length,840);assert.equal(new Set(Core.codes.map(c=>c.join(''))).size,840);
for(const mode of ['beginner','advanced'])for(let i=0;i<840;i+=11)for(let j=0;j<840;j+=13){assert.equal(Core.feedback(Core.codes[i],Core.codes[j],mode),Core.fromScore(Game.score(Core.codes[i],Core.codes[j]),mode));}
const sequence=[[0,1,2,3],[0,1,3,4],[0,3,5,6],[0,5,6,1],[5,1,0,6],[6,1,5,0]],secret=[6,1,5,0];
const history=[];const counts=[144,32,4,2,1,1];
sequence.forEach((guess,i)=>{history.push({guess,score:Game.score(secret,guess)});const t=Core.trace(history,'advanced');assert.equal(t.remaining.length,counts[i]);assert(t.remaining.some(id=>Core.codes[id].join('')===secret.join('')));for(const s of t.stages)assert.equal(s.branches.reduce((sum,b)=>sum+b.ids.length,0),s.before);});
let S=Core.all;for(const guess of sequence){assert.deepEqual(Core.recommend(S,'advanced').guess,guess);S=Core.group(S,guess,'advanced').find(b=>b.key===Core.feedback(secret,guess,'advanced')).ids;}
assert.deepEqual(Core.recommend([0],'beginner').guess,Core.codes[0]);
assert.throws(()=>Core.group(Core.all,[0,0,1,2],'advanced'));assert.throws(()=>Core.recommend([],'advanced'));
class El{
 constructor(id){this.id=id;this.listeners={};this.dataset={};this.style={setProperty(){}};this.classList={toggle(){}};this.children={};this.attributes={};this.open=false;this.disabled=false;this._html='';}
 set innerHTML(v){this._html=v;this.nodes=[...v.matchAll(/data-explore="([0-9]+)"/g)].map(m=>Object.assign(new El('explore'),{dataset:{explore:m[1]}}));}get innerHTML(){return this._html;}
 addEventListener(n,f){this.listeners[n]=f;}setAttribute(n,v){this.attributes[n]=v;}
 querySelector(n){return this.children[n]??=new El(n);}querySelectorAll(){return this.nodes??[];}
 focus(){}scrollIntoView(){}showModal(){this.open=true;}close(){this.open=false;}
 closest(s){for(const key of ['color','slot','branch'])if(s===`[data-${key}]`&&this.dataset[key]!==undefined)return this;return null;}
 click(){if(!this.disabled)return this.listeners.click?.({target:this});}
}
const ids=new Map(),slots=Array.from({length:4},(_,i)=>Object.assign(new El('slot'+i),{dataset:{slot:String(i)}}));
const palette=Array.from({length:7},(_,i)=>Object.assign(new El('color'+i),{dataset:{color:String(i)}}));
const tools=new Map(),events={};const doc={body:new El('body'),getElementById:id=>{if(!ids.has(id))ids.set(id,new El(id));return ids.get(id);},querySelectorAll:s=>s==='[data-slot]'?slots:palette,querySelector:s=>slots[Number(s.match(/\d/)[0])],addEventListener:(n,f)=>events[n]=f,modelContext:{registerTool:t=>tools.set(t.name,t)}};
// Run the real worker code in a separate VM context; deliver messages asynchronously.
class TestWorker{
 constructor(){const self={postMessage:data=>setTimeout(()=>this.onmessage?.({data}),0)};this.worker=vm.createContext({self,console});this.worker.importScripts=()=>vm.runInContext(fs.readFileSync(base+'decision.js','utf8'),this.worker);vm.runInContext(fs.readFileSync(base+'decision-worker.js','utf8'),this.worker);}
 postMessage(data){setTimeout(()=>this.worker.self.onmessage({data}),0);}terminate(){}
}
const math=Object.create(Math);math.random=()=>0;
const ctx=vm.createContext({document:doc,window:{addEventListener(){}},addEventListener(){},Math:math,AbortController,console,setTimeout,Worker:TestWorker});
for(const file of ['decision.js','tree.js','game.js'])vm.runInContext(fs.readFileSync(base+file,'utf8'),ctx);
const delay=async()=>{for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,20));if(!ids.get('tree-canvas').innerHTML.includes('正在寻找下一次试探')){await new Promise(r=>setTimeout(r,20));return;}}throw new Error('Recommendation timed out: '+ids.get('tree-canvas').innerHTML);},read=()=>tools.get('read_code_game').execute({}),start=mode=>tools.get('start_new_code_game').execute({mode}),submit=colors=>tools.get('submit_code_guess').execute({colors});
(async()=>{
 await delay();assert.equal(ids.get('candidate-count').textContent,840);assert(ids.get('tree-canvas').innerHTML.includes('建议下一次试探'));
 start('advanced');await delay();submit([1,2,3,4]);await delay();
 const expected=Core.trace([{guess:[0,1,2,3],score:Game.score([1,2,3,4],[0,1,2,3])}],'advanced').remaining.length;
 assert.equal(ids.get('candidate-count').textContent,expected);assert(ids.get('tree-canvas').innerHTML.includes('实际反馈'));assert.equal(read().history.length,1);
 const branch=ids.get('tree-canvas').innerHTML.match(/data-branch="(\d+)"/)[1];ids.get('tree-canvas').listeners.click({target:Object.assign(new El('branch'),{dataset:{branch}})});
 assert.equal(ids.get('tree-inspector').hidden,false);assert(ids.get('tree-inspector').innerHTML.includes('个候选'));
 await ids.get('expand-branch').click();await delay();assert(ids.get('tree-inspector').innerHTML.includes('data-explore'));const children=ids.get('tree-inspector').nodes;assert(children.length>0);children[0].click();assert(ids.get('tree-inspector').innerHTML.includes('返回上一层'));ids.get('explore-back').click();assert.equal(read().history.length,1);
 const before=read().history.length;ids.get('fill-suggestion').click();assert.equal(read().history.length,before);assert.equal(ids.get('submit').disabled,false);
 ids.get('preview-draft').click();assert(ids.get('tree-canvas').innerHTML.includes('你的猜测预览'));
 start('beginner');await delay();assert.equal(ids.get('candidate-count').textContent,840);assert.equal(ids.get('tree-inspector').hidden,true);assert(!ids.get('tree-canvas').innerHTML.includes('实际反馈'));
 submit([2,3,4,5]);await delay();assert.equal(ids.get('candidate-count').textContent,1);assert(ids.get('tree-canvas').innerHTML.includes('解码成功'));assert.equal(ids.get('preview-draft').disabled,true);
 start('advanced');for(let i=0;i<7;i++)submit([1,2,3,4]);await delay();assert(ids.get('tree-canvas').innerHTML.includes('机会用完'));assert.equal(ids.get('preview-recommendation').disabled,true);
 start('beginner');start('advanced');await delay();assert.equal(ids.get('candidate-count').textContent,840);assert(ids.get('tree-canvas').innerHTML.includes('建议下一次试探'));
 for(const f of ['style.css','tree.css','decision.js','tree.js','decision-worker.js','game.js'])assert(fs.existsSync(base+f));
 console.log('PASS: both feedback modes, exact candidate counts, recommendation sequence, partition conservation, live game integration, worker messages, branch exploration/back, draft preview/fill, win/loss, restart, stale computation protection.');
 console.log('DOM/worker model checks only; real browser visual QA is not included.');
})().catch(e=>{console.error(e);process.exitCode=1;});
