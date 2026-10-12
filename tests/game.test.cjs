const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path=require('node:path');
const publicDirectory=path.resolve(__dirname,'../public');
const filename=path.join(publicDirectory,'game.js');
const {score,makeSecret,validGuess}=require(filename);
assert.deepEqual(score([0,1,2,3],[0,2,4,1]),{exact:1,misplaced:2,absent:1,positions:['correct','misplaced','absent','misplaced']});
assert.equal(score([0,1,2,3],[1,0,3,2]).misplaced,4);
assert.equal(score([0,1,2,3],[0,1,2,3]).exact,4);
assert.equal(validGuess([0,0,2,3]),false);assert.equal(validGuess([0,1,2,7]),false);
for(let n=0;n<1000;n++)assert(validGuess(makeSecret()));
class El{
 constructor(id){this.id=id;this.listeners={};this.dataset={};this.style={setProperty(){}};this.classList={toggle(){}};this.children={};this.open=false;this.attributes={};}
 addEventListener(n,f){this.listeners[n]=f;}setAttribute(n,v){this.attributes[n]=v;}
 querySelector(n){return this.children[n]??=new El(n);}focus(){}showModal(){this.open=true;}close(){this.open=false;}
 closest(s){return (s==='[data-color]'&&this.dataset.color!==undefined)||(s==='[data-slot]'&&this.dataset.slot!==undefined)?this:null;}
 click(){if(!this.disabled)this.listeners.click?.({target:this});}
}
const ids=new Map(),slots=Array.from({length:4},(_,i)=>Object.assign(new El('slot'+i),{dataset:{slot:String(i)}}));
const palette=Array.from({length:7},(_,i)=>Object.assign(new El('color'+i),{dataset:{color:String(i)}}));
const tools=new Map(),events={};const doc={body:new El('body'),getElementById:id=>{if(!ids.has(id))ids.set(id,new El(id));return ids.get(id);},querySelectorAll:s=>s==='[data-slot]'?slots:palette,querySelector:s=>slots[Number(s.match(/\d/)[0])],addEventListener:(n,f)=>events[n]=f,modelContext:{registerTool:t=>tools.set(t.name,t)}};
const math=Object.create(Math);math.random=()=>0;
vm.runInNewContext(fs.readFileSync(filename,'utf8'),{document:doc,window:{addEventListener(){}},Math:math,AbortController,console});
assert.equal(tools.size,3);assert.equal(tools.get('read_code_game').annotations.readOnlyHint,true);
const read=()=>tools.get('read_code_game').execute({});
const submit=colors=>tools.get('submit_code_guess').execute({colors});
const start=mode=>tools.get('start_new_code_game').execute({mode});
assert.equal(read().attemptsRemaining,7);assert.equal(read().answer,undefined);
assert.throws(()=>submit([1,1,2,3]));assert.equal(read().history.length,0);
assert.throws(()=>submit(['1',2,3,4]));assert.throws(()=>start('bad'));
assert.equal(submit([2,3,4,5]).status,'won');assert.equal(read().attemptsRemaining,6);assert.deepEqual(Array.from(read().answer),['橙','黄','绿','蓝']);
assert.throws(()=>submit([1,2,3,4]));assert.equal(read().history.length,1);
start('advanced');for(let n=0;n<7;n++)submit([1,2,3,4]);assert.equal(read().status,'lost');assert.equal(read().attemptsRemaining,0);assert.equal(read().history[0].positions,undefined);
start('beginner');
for(let i=0;i<4;i++)ids.get('palette').listeners.click({target:palette[i]});
assert.equal(ids.get('submit').disabled,false);
events.keydown({key:'Enter',target:palette[3],preventDefault(){}});assert.equal(read().history.length,1);
ids.get('advanced').click();assert.equal(ids.get('restart-dialog').open,true);ids.get('cancel-restart').click();assert.equal(read().mode,'beginner');
ids.get('advanced').click();ids.get('confirm-restart').click();assert.equal(read().mode,'advanced');assert.equal(read().history.length,0);
console.log('PASS: scoring, unique passwords, invalid inputs, win/loss, keyboard submission, mode restart, and 3 WebMCP action contracts.');
const html=fs.readFileSync(path.join(publicDirectory,'index.html'),'utf8');
for(const asset of ['style.css','game.js'])assert(html.includes(asset)&&fs.existsSync(path.join(publicDirectory,asset)));
console.log('PASS: local assets and JavaScript syntax verified. API contracts verified with a DOM harness; real browser compatibility is not tested.');
