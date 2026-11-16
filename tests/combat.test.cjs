const assert=require('node:assert/strict');
const {Match,MOVES}=require('../combat.js');
const ticks=(m,n,input={})=>{for(let i=0;i<n;i++)m.step(input);};
function duel(){const m=new Match();m.ai=()=>{};m.fighters[0].x=0;m.fighters[1].x=1.1;return m;}
let m=duel();m.action('punch');ticks(m,8);assert.equal(m.fighters[1].hp,92);ticks(m,10);assert.equal(m.fighters[1].hp,92,'one damage event per attack');
m=duel();m.fighters[1].state='block';m.aiInput={block:true};m.action('punch');ticks(m,12);assert.equal(m.fighters[1].hp,99);assert.equal(m.fighters[1].stun,0);
m=duel();m.fighters[1].x=4;m.action('kick');ticks(m,40);assert.equal(m.fighters[1].hp,100,'range matters');
m=duel();m.fighters[1].y=3;m.fighters[1].vy=8;m.action('punch');ticks(m,9);assert.equal(m.fighters[1].hp,100,'vertical hurtbox avoids low attack');
m=duel();m.action('jump');ticks(m,20);assert.ok(m.fighters[0].y>1);ticks(m,60);assert.equal(m.fighters[0].y,0);
m=duel();m.fighters[0].x=6;m.fighters[1].x=6.1;ticks(m,60,{right:true});assert.ok(m.fighters.every(f=>f.x<=6.1&&f.x>=-6.1));assert.ok(Math.abs(m.fighters[0].x-m.fighters[1].x)>=.759);
m=duel();m.fighters[1].hp=8;m.action('punch');ticks(m,8);assert.equal(m.result,'ПОБЕДА');const frozen=m.tick;ticks(m,60);assert.equal(m.tick,frozen);
m=duel();m.remaining=1;m.step();assert.equal(m.result,'НИЧЬЯ');
m=duel();m.fighters[1].attack='punch';m.fighters[1].age=MOVES.punch.wind-1;m.fighters[0].attack='punch';m.fighters[0].age=MOVES.punch.wind-1;m.step();assert.deepEqual(m.fighters.map(f=>f.hp),[92,92],'simultaneous trade');
// Web is a projectile: it needs travel time, can miss or be blocked, and cannot retrigger on cooldown.
m=duel();m.fighters[1].x=4;m.action('special');ticks(m,16);assert.equal(m.fighters[1].hp,100);ticks(m,25);assert.equal(m.fighters[1].hp,94);assert.ok(m.fighters[1].webbed>0);assert.equal(m.projectiles.length,0);assert.ok(m.fighters[0].cooldown>0);
const rooted=m.fighters[1].x;m.aiInput={right:true};ticks(m,8);assert.equal(m.fighters[1].x,rooted,'silk prevents walking');m.aiInput={};ticks(m,65);assert.equal(m.fighters[1].webbed,0,'silk expires');
m=duel();m.fighters[1].x=4;m.aiInput={block:true};m.action('special');ticks(m,45);assert.equal(m.fighters[1].hp,99);assert.equal(m.fighters[1].webbed,0,'blocking prevents root');
m=duel();m.fighters[1].x=4;m.action('special');ticks(m,20);m.fighters[1].y=3;m.fighters[1].vy=8;ticks(m,25);assert.equal(m.fighters[1].hp,100,'jump evades travelling silk');ticks(m,80);assert.equal(m.projectiles.length,0,'missed projectiles expire');
m=duel();m.fighters[0].cooldown=100;m.action('special');m.step();assert.equal(m.fighters[0].attack,null,'cooldown rejects web cast');
m=duel();m.fighters[1].webbed=60;m.action('kick');ticks(m,14);assert.equal(m.fighters[1].hp,80,'cocoon shatter adds seven damage');assert.equal(m.fighters[1].webbed,0);
m=duel();m.fighters[1].hp=6;m.action('special');ticks(m,25);assert.equal(m.result,'ПОБЕДА','web KO ends round');
const a=new Match(42),b=new Match(42);for(let i=0;i<5400;i++){if(i%45===0){a.action('kick');b.action('kick');}a.step({right:i<100});b.step({right:i<100});}assert.deepEqual(a,b,'seed and tick inputs reproduce a round');assert.ok(a.result);assert.ok(a.fighters.some(f=>f.hp<100),'AI engages');
console.log('OK: attack windows, range, vertical evasion, block, single hit, jump, walls, KO, timeout, trades, deterministic AI, silk travel/block/evasion/expiry/cooldown/root and cocoon shatter');
// Both fighters share bounded aerial movement; all flip timing is simulation state.
for(const index of [0,1]){
  m=duel();m.fighters[1].x=5;
  const f=m.fighters[index],other=m.fighters[1-index];
  m.advance(f,{},'jump',other);assert.equal(f.jumpsUsed,1);
  for(let i=0;i<22;i++)m.advance(f,{},undefined,other);
  const firstApex=f.y;m.advance(f,{left:true},'jump',other);
  assert.equal(f.jumpsUsed,2);assert.equal(f.flipRemaining,30);assert.equal(f.flipDir,-1);assert.equal(f.vy,7.5);
  m.advance(f,{},'jump',other);assert.ok(f.vy<7.5,'third press cannot boost');assert.equal(f.jumpsUsed,2);
  let peak=f.y;for(let i=0;i<120;i++){m.advance(f,{},undefined,other);peak=Math.max(peak,f.y);}
  assert.ok(peak>firstApex+.8);assert.equal(f.y,0);assert.equal(f.jumpsUsed,0);assert.equal(f.flipRemaining,0);
  m.advance(f,{},'jump',other);f.webbed=10;const velocity=f.vy;m.advance(f,{},'jump',other);assert.equal(f.jumpsUsed,1);assert.ok(f.vy<velocity,'root prevents air jump');
  f.webbed=0;f.stun=5;m.advance(f,{},'jump',other);assert.equal(f.jumpsUsed,1,'stun prevents air jump');
}
m=duel();m.fighters[1].x=5;m.action('jump');m.step();ticks(m,10);m.action('kick');m.step();assert.equal(m.fighters[0].attack,'kick','attacks work in the air');
const acrobat=new Match(73);let botJump=false,botFlip=false;for(let i=0;i<900;i++){if(i%80===0)acrobat.action('jump');if(i%80===22)acrobat.action('jump');acrobat.step({});botJump ||= acrobat.fighters[1].jumpsUsed>0;botFlip ||= acrobat.fighters[1].flipRemaining>0;if(acrobat.result)break;}assert.ok(botJump);assert.ok(botFlip,'AI can double jump');
console.log('OK: both double jumps, flip timing, height, third jump limit, landing reset, root/stun, air attacks and AI acrobatics');
