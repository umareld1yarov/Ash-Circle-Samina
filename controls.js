(function(root){
  function bind(document,input,action,playing){
    const stick=document.querySelector('#joystick');
    const thumb=document.querySelector('.stick-thumb');
    const buttons=[...document.querySelectorAll('[data-hold],[data-action]')];
    const held=new Map();
    const keyboard=new Map();
    let pointer=null,up=false,directions={left:false,right:false,block:false};
    function sync(){
      for(const key of ['left','right','block'])input[key]=directions[key]||[...held.values()].some(b=>b.dataset.hold===key)||[...keyboard.values()].includes(key);
    }
    function center(){
      pointer=null;up=false;directions={left:false,right:false,block:false};
      thumb.style.transform='translate(-50%, -50%)';stick.classList.remove('active');sync();
    }
    function move(e){
      const r=stick.getBoundingClientRect(),radius=r.width*.32;
      const dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
      const scale=Math.min(1,radius/(Math.hypot(dx,dy)||1));
      const x=dx*scale,y=dy*scale;
      thumb.style.transform=`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      directions={left:x<-radius*.28,right:x>radius*.28,block:y>radius*.45&&Math.abs(x)<radius*.6};sync();
      const jumping=y<-radius*.45;
      if(jumping&&!up)action('jump');
      up=jumping;
    }
    stick.addEventListener('pointerdown',e=>{
      e.preventDefault();if(pointer!==null||!playing())return;
      pointer=e.pointerId;stick.setPointerCapture(pointer);stick.classList.add('active');move(e);
    });
    stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();move(e);}});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,e=>{if(e.pointerId===pointer)center();});
    for(const button of buttons){
      button.addEventListener('pointerdown',e=>{
        e.preventDefault();if(!playing())return;
        button.setPointerCapture(e.pointerId);held.set(e.pointerId,button);button.classList.add('active');
        sync();if(button.dataset.action)action(button.dataset.action);
      });
      for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,e=>{
        if(held.get(e.pointerId)!==button)return;
        held.delete(e.pointerId);if(![...held.values()].includes(button))button.classList.remove('active');sync();
      });
    }
    return {setKey(code,key,down){if(down)keyboard.set(code,key);else keyboard.delete(code);sync();},reset(){keyboard.clear();held.clear();center();buttons.forEach(b=>b.classList.remove('active'));}};
  }
  root.AshControls={bind};
  if(typeof module!=='undefined')module.exports=root.AshControls;
})(typeof window!=='undefined'?window:globalThis);
