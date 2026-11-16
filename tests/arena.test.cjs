const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map(),events={},docEvents={};
const ctx=new Proxy({}, {get:(_,k)=>String(k).startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true});
function node(s){if(!nodes.has(s))nodes.set(s,{style:{},dataset:{},hidden:false,textContent:'',attrs:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},setAttribute(k,v){this.attrs[k]=v;},parentElement:{setAttribute(){}},getContext(){return ctx;}});return nodes.get(s);}
const document={hidden:false,querySelector:node,querySelectorAll:()=>[],addEventListener:(k,v)=>docEvents[k]=v};
let frame,time=0;
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../game.js'),'utf8'),{AshCombat:require('../combat.js'),AshControls:require('../controls.js'),document,window:{addEventListener:(k,v)=>events[k]=v},requestAnimationFrame:cb=>frame=cb,setTimeout:()=>0,console});
const click=s=>node(s).onclick(),screen=()=>node('#overlay').dataset.screen;
function tick(n=1){for(let i=0;i<n;i++){time+=20;frame(time);}}
assert.equal(screen(),'home');tick();click('#start');assert.equal(node('#overlay').hidden,true);tick(10);
events.keydown({code:'KeyJ',repeat:false,preventDefault(){}});assert.equal(node('.shell').dataset.lastAction,'punch');
click('#arena-pause');assert.equal(screen(),'paused');assert.equal(node('.shell').dataset.lastAction,undefined);tick(10);click('#start');assert.equal(node('#overlay').hidden,true);
events.blur();assert.equal(screen(),'paused');click('#menu-home');assert.equal(screen(),'home');
click('#menu-help');assert.equal(screen(),'help');assert.equal(node('#help-panel').hidden,false);assert.equal(node('#start').hidden,true);click('#menu-back');assert.equal(screen(),'home');
click('#menu-settings');assert.equal(node('#settings-panel').hidden,false);click('#menu-sound');assert.equal(node('#menu-sound').textContent,'ЗВУК: ВКЛ.');click('#menu-back');
click('#start');document.hidden=true;docEvents.visibilitychange();assert.equal(screen(),'paused');document.hidden=false;docEvents.visibilitychange();assert.equal(screen(),'paused');
document.hidden=false;click('#start');tick(6000);assert.equal(screen(),'result');assert.equal(node('#start').textContent,'ЕЩЁ РАУНД');click('#start');assert.equal(node('#health0').textContent,100);assert.equal(node('#health1').textContent,100);click('#arena-pause');const pausedTimer=node('#timer').textContent;tick(120);assert.equal(node('#timer').textContent,pausedTimer);
console.log('OK: combat arena, action input, pause/resume, blur, visibility, home, help and settings');
