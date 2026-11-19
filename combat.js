/* Combat uses integer 60 Hz ticks. Rendering never changes simulation state. */
(function(root){
  'use strict';
  const STEP=1/60, LIMIT=6.1;
  const MOVES={punch:{wind:7,active:5,total:24,reach:1.12,low:.8,high:2.1,damage:8,stun:15},kick:{wind:13,active:6,total:36,reach:1.65,low:.45,high:1.65,damage:13,stun:21},special:{wind:21,active:9,total:53,reach:2.05,low:.3,high:2.35,damage:20,stun:28}};
  // Both fighters share the same special-move budget: 20 damage, 28-frame stun,
  // and 210-frame cooldown. Web trades instant close range for a visible projectile
  // that can be blocked or jumped over; its root lasts exactly as long as the stun.
  const WEB={wind:16,active:1,total:43,reach:0,low:.7,high:1.9,damage:20,stun:28};
  function move(f,type=f.attack){return f.kind==='weaver'&&type==='special'?WEB:MOVES[type];}
  function fighter(name,x,face){return {name,kind:'melee',webbed:0,x,y:0,vy:0,jumpsUsed:0,flipRemaining:0,flipDir:1,face,hp:100,state:'idle',age:0,attack:null,hit:false,stun:0,cooldown:0,flash:0,walk:0};}
  class Match{
    constructor(seed=173){this.fighters=[Object.assign(fighter('ТЕНЕТНИК',-2.6,1),{kind:'weaver'}),fighter('ИРА · НЕФРИТ',2.6,-1)];this.projectiles=[];this.nextProjectile=1;this.tick=0;this.remaining=90*60;this.result=null;this.seed=seed;this.events=[];this.pending=[];this.aiAction=null;this.aiInput={};}
    random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
    action(type){if(['jump','punch','kick','special'].includes(type)&&this.pending.length<4)this.pending.push(type);}
    ai(){const [p,a]=this.fighters,dist=Math.abs(p.x-a.x);this.aiAction=null;
      // Beginner-friendly opponent: same fighter stats, with slower decisions and
      // fewer automatic counters so a new player has time to react and learn.
      if(this.tick%24!==0)return;
      const danger=p.attack&&p.age<move(p).wind+move(p).active;
      this.aiInput={left:dist>1.45&&p.x<a.x,right:dist>1.45&&p.x>a.x,block:dist<2.0&&danger&&this.random()<.28};
      const incoming=this.projectiles.some(b=>b.owner===0&&(a.x-b.x)*b.vx>0&&Math.abs(a.x-b.x)<2.4);
      if(!a.attack&&!a.stun&&!a.webbed&&a.jumpsUsed<2&&((a.y===0&&(incoming||(p.y>1&&dist<2.7)||(dist>1.8&&dist<4&&this.random()<.18)))||(a.y>.7&&a.vy<1&&a.jumpsUsed===1&&(incoming||p.y>.3||this.random()<.35)))){this.aiAction='jump';this.aiInput.block=false;}
      else if(dist<1.65&&!this.aiInput.block&&(a.y===0||a.jumpsUsed===2||a.vy<-2)&&this.random()<.72)this.aiAction=this.random()<.68?'punch':this.random()<.85?'kick':'special';
    }
    advance(f,input,action,other){
      f.age++;f.webbed=Math.max(0,f.webbed-1);f.flash=Math.max(0,f.flash-1);f.cooldown=Math.max(0,f.cooldown-1);f.flipRemaining=Math.max(0,f.flipRemaining-1);
      if(f.y>0||f.vy>0){f.vy-=20*STEP;f.y=Math.max(0,f.y+f.vy*STEP);if(f.y===0){f.vy=0;f.jumpsUsed=0;f.flipRemaining=0;}}
      if(f.stun>0){f.stun--;f.flipRemaining=0;f.state=f.hp<=0?'ko':'hurt';return;}
      if(f.attack){if(f.age>=move(f).total){f.attack=null;f.age=0;}else return;}
      f.face=other.x>=f.x?1:-1;
      if(action==='jump'&&!f.webbed&&(f.y===0||f.jumpsUsed<2)){
        const airborne=f.y>0;f.jumpsUsed=airborne?2:1;f.vy=airborne?7.5:8;f.y=Math.max(.001,f.y);
        if(airborne){f.flipRemaining=30;f.flipDir=Number(!!input.right)-Number(!!input.left)||f.face;}
        this.events.push(airborne?'flip':'jump');
      }
      f.state=input.block&&f.y===0?'block':f.y>0?'jump':'idle';
      if(MOVES[action]&&f.state!=='block'&&(action!=='special'||f.cooldown===0)){
        f.attack=action;f.state=action;f.age=0;f.hit=false;if(action==='special')f.cooldown=210;return;
      }
      if(f.state!=='block'&&!f.webbed){const dir=Number(!!input.right)-Number(!!input.left);f.x=Math.max(-LIMIT,Math.min(LIMIT,f.x+dir*3.4*STEP));if(dir){f.walk++;if(!f.y)f.state='walk';}}
    }
    hitbox(f){if(!f.attack||(f.kind==='weaver'&&f.attack==='special'))return null;const m=move(f);if(f.age<m.wind||f.age>=m.wind+m.active||f.hit)return null;const edge=f.x+f.face*.25;return {left:Math.min(edge,edge+f.face*m.reach),right:Math.max(edge,edge+f.face*m.reach),bottom:f.y+m.low,top:f.y+m.high};}
    hurtbox(f){return {left:f.x-.38,right:f.x+.38,bottom:f.y+.12,top:f.y+2.35};}
    step(input={}){
      if(this.result)return;this.events=[];this.tick++;this.remaining--;this.ai();
      const [p,a]=this.fighters;
      this.advance(p,input,this.pending.shift(),a);this.advance(a,this.aiInput,this.aiAction,p);
      for(const [index,f] of this.fighters.entries())if(f.kind==='weaver'&&f.attack==='special'&&f.age===WEB.wind){this.projectiles.push({id:this.nextProjectile++,owner:index,x:f.x+f.face*.65,y:f.y+1.45,vx:f.face*10,life:90});this.events.push('webshot');}
      // Bodies share the fighting plane. Separate symmetrically; walls absorb overflow.
      const dx=a.x-p.x,sep=.76-Math.abs(dx);
      if(sep>0&&Math.abs(p.y-a.y)<2){const dir=dx>=0?1:-1;p.x=Math.max(-LIMIT,Math.min(LIMIT,p.x-dir*sep/2));a.x=Math.max(-LIMIT,Math.min(LIMIT,a.x+dir*sep/2));if(Math.abs(a.x-p.x)<.76){if(Math.abs(p.x)===LIMIT)a.x=p.x+dir*.76;else p.x=a.x-dir*.76;}}
      const hits=[];
      for(const [f,target] of [[p,a],[a,p]]){const h=this.hitbox(f),b=this.hurtbox(target);if(h&&h.left<b.right&&h.right>b.left&&h.bottom<b.top&&h.top>b.bottom)hits.push([f,target,move(f)]);}
      for(const [f,target,m] of hits){const blocked=target.state==='block'&&target.face*(f.x-target.x)>0;f.hit=true;const shatter=!blocked&&f.kind==='weaver'&&m===MOVES.kick&&target.webbed>0;target.hp=Math.max(0,target.hp-(blocked?1:m.damage+(shatter?7:0)));if(shatter){target.webbed=0;this.events.push('shatter');}target.flash=blocked?5:10;target.x=Math.max(-LIMIT,Math.min(LIMIT,target.x+f.face*(blocked?.06:.2)));if(!blocked){target.stun=m.stun;target.state='hurt';target.attack=null;target.age=0;}this.events.push(blocked?'block':'hit');}
      for(const bolt of this.projectiles){
        const prev=bolt.x;bolt.x+=bolt.vx*STEP;bolt.life--;const target=this.fighters[1-bolt.owner],b=this.hurtbox(target);
        if(Math.max(prev,bolt.x)+.14>b.left&&Math.min(prev,bolt.x)-.14<b.right&&bolt.y+.16>b.bottom&&bolt.y-.16<b.top){
          const blocked=target.state==='block'&&target.face*bolt.vx<0;target.hp=Math.max(0,target.hp-(blocked?1:WEB.damage));target.flash=blocked?5:10;
          if(!blocked){target.webbed=WEB.stun;target.stun=WEB.stun;target.attack=null;target.state='hurt';target.age=0;}bolt.life=0;this.events.push(blocked?'block':'webhit');
        }
        if(Math.abs(bolt.x)>7)bolt.life=0;
      }
      this.projectiles=this.projectiles.filter(b=>b.life>0);
      if(p.hp===0||a.hp===0||this.remaining<=0){this.result=p.hp===a.hp?'НИЧЬЯ':p.hp>a.hp?'ПОБЕДА':'ПОРАЖЕНИЕ';for(const f of this.fighters)if(!f.hp){f.state='ko';f.attack=null;}this.events.push('round');}
    }
  }
  root.AshCombat={Match,STEP,MOVES,WEB,move};if(typeof module!=='undefined')module.exports=root.AshCombat;
})(typeof window!=='undefined'?window:globalThis);
