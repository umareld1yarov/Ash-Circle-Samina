const assert=require('node:assert/strict');
const {bind}=require('../controls.js');
function node(dataset={}){
  const events={};return {dataset,style:{},classList:{add(){},remove(){}},
    addEventListener(k,f){events[k]=f;},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:160,height:160};},
    send(k,id,x=80,y=80){events[k]({pointerId:id,clientX:x,clientY:y,preventDefault(){}});}};
}
const stick=node(),thumb=node(),block=node({hold:'block'}),punch=node({action:'punch'});
const input={},actions=[];let playing=true;
const controls=bind({querySelector:s=>s==='#joystick'?stick:thumb,querySelectorAll:()=>[block,punch]},input,a=>actions.push(a),()=>playing);
stick.send('pointerdown',1,150,80);assert.equal(input.right,true);
punch.send('pointerdown',2);assert.deepEqual(actions,['punch']);assert.equal(input.right,true);
punch.send('pointerup',2);assert.equal(input.right,true);
stick.send('pointermove',1,20,20);assert.equal(input.left,true);assert.equal(input.right,false);assert.equal(actions.at(-1),'jump');
const n=actions.length;stick.send('pointermove',1,20,10);assert.equal(actions.length,n,'holding up must not repeat jump');
stick.send('pointerdown',9,150,80);stick.send('pointerup',9);assert.equal(input.left,true,'second finger cannot steal joystick');
stick.send('pointercancel',1);assert.equal(input.left,false);assert.equal(thumb.style.transform,'translate(-50%, -50%)');
block.send('pointerdown',3);stick.send('pointerdown',1,80,140);stick.send('pointerup',1);assert.equal(input.block,true,'button still holds block');block.send('pointerup',3);assert.equal(input.block,false);
controls.setKey('KeyD','right',true);stick.send('pointerdown',1,20,80);stick.send('pointerup',1);assert.equal(input.right,true,'touch release preserves keyboard');controls.setKey('KeyD','right',false);assert.equal(input.right,false);
stick.send('pointerdown',1,150,80);block.send('pointerdown',3);controls.reset();assert.deepEqual(input,{left:false,right:false,block:false});stick.send('pointermove',1,150,80);assert.equal(input.right,false,'pause cancels captured touch');
playing=false;stick.send('pointerdown',1,150,80);punch.send('pointerdown',2);assert.equal(input.right,false);assert.equal(actions.length,n);
console.log('OK: joystick, diagonals, jump edge, multitouch attack/block, cancel, keyboard and pause reset');
