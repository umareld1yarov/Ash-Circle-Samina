(() => {
  'use strict';
  const $=s=>document.querySelector(s),canvas=$('#game'),ctx=canvas.getContext('2d');
  const arenaImage=$('#arena-backdrop'),input={left:false,right:false,block:false};
  let renderer3d=null,mode='intro',last=0,visualTime=0,sound=false,audio=null;
  let match=new AshCombat.Match(),accumulator=0;
  function hud(){match.fighters.forEach((f,i)=>{$('#hp'+i).style.width=f.hp+'%';$('#hp'+i).parentElement.setAttribute('aria-valuenow',f.hp);$('#health'+i).textContent=f.hp;});$('#timer').textContent=Math.ceil(match.remaining/60);const cd=match.fighters[0].cooldown;$('#special').classList.toggle('ready',cd===0);$('#special small').textContent=cd?'ПАУТИНА · '+(cd/60).toFixed(1):'ПАУТИНА';$('#ability-status').textContent=match.fighters[1].webbed?'ВРАГ В ПАУТИНЕ · K / НОГА — РАЗРЫВ КОКОНА':'J — ТЕНЕВОЙ ВЫПАД · K — СЕРПОВЫЙ УДАР · L — ПАУТИНА';}
  function finish(){clearInput();mode='result';$('.shell').dataset.state=mode;$('#overlay').hidden=false;$('#overlay').dataset.screen='result';$('#message').textContent=match.result+' · '+match.fighters[0].hp+' : '+match.fighters[1].hp;$('#start').textContent='ЕЩЁ РАУНД';$('#start').hidden=false;$('#menu-help').hidden=true;$('#menu-settings').hidden=true;$('#menu-home').hidden=false;}
  const motes=Array.from({length:55},(_,i)=>({x:i*7919%1280,y:i*137%660,r:1+i%3,s:10+i%20}));
  try{if(typeof AshRenderer3D==='function'){renderer3d=new AshRenderer3D($('#scene3d'));$('.shell').classList.add('gl-mode');$('#render-status').textContent='2D-бойцы · Babylon.js';}}catch(error){console.warn('3D unavailable:',error.message);}
  function unlockAudio(){if(!sound||document.hidden)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
  function silence(){if(audio)audio.suspend().catch(()=>{});}
  function tone(kind='ui'){if(!sound||!audio||audio.state!=='running'||document.hidden||mode==='paused')return;try{const osc=audio.createOscillator(),gain=audio.createGain();osc.type=kind==='webshot'?'sawtooth':'triangle';osc.frequency.value=kind==='hit'?110:kind==='block'?240:kind==='webshot'?720:kind==='webhit'?180:kind==='shatter'?90:500;gain.gain.setValueAtTime(.04,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.08);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+.08);}catch{}}
  function toggleSound(){sound=!sound;$('#sound').textContent='Звук: '+(sound?'вкл.':'выкл.');$('#menu-sound').textContent='ЗВУК: '+(sound?'ВКЛ.':'ВЫКЛ.');$('#arena-sound').setAttribute('aria-pressed',String(sound));$('#arena-sound').setAttribute('aria-label','Звук: '+(sound?'включен':'выключен'));if(sound){unlockAudio();tone();}else silence();}
  function line(x1,y1,x2,y2,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
  function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
  function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function background(t){if(arenaImage.complete&&arenaImage.naturalWidth>0){ctx.clearRect(0,0,1280,660);return;}
    const g=ctx.createLinearGradient(0,0,0,660);g.addColorStop(0,'#111c2b');g.addColorStop(.6,'#34404b');g.addColorStop(1,'#11171e');ctx.fillStyle=g;ctx.fillRect(0,0,1280,660);
    glow(640,170,340,'#8ca6ad1c');
    // Distant broken mountains and forge silhouettes.
    polygon([[0,310],[90,236],[140,270],[238,160],[335,294],[430,227],[530,300],[650,196],[770,290],[900,194],[990,280],[1110,210],[1280,295],[1280,530],[0,530]],'#192733');
    ctx.fillStyle='#1a2730';for(let x=130;x<1280;x+=240){ctx.fillRect(x,210,24,300);ctx.fillRect(x-15,209,54,12);ctx.fillRect(x+3,190,18,19);}
    ctx.save();ctx.translate(640,330);ctx.strokeStyle='#99b4bb16';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,168,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,150,0,Math.PI*2);ctx.stroke();polygon([[0,-125],[110,65],[-110,65]],'#8299a509');line(0,-125,110,65,'#99b4bb18',2);line(110,65,-110,65,'#99b4bb18',2);line(-110,65,0,-125,'#99b4bb18',2);ctx.restore();
    for(const x of [65,1215]){ctx.fillStyle='#111b25';ctx.fillRect(x-26,120,52,405);ctx.fillStyle='#33404b';ctx.fillRect(x-34,117,68,13);ctx.fillRect(x-39,502,78,20);for(let y=150;y<480;y+=48)line(x-22,y,x+22,y,'#44515a33',2);}
    const ground=ctx.createLinearGradient(0,496,0,660);ground.addColorStop(0,'#333c42');ground.addColorStop(1,'#151c24');ctx.fillStyle=ground;ctx.fillRect(0,496,1280,164);line(0,496,1280,496,'#9aa4a326',2);
    for(let x=-160;x<1500;x+=150)line(640+(x-640)*.65,496,x,660,'#9ba6ad10',1);for(const y of [521,558,610])line(0,y,1280,y,'#9ba6ad12',1);
    ctx.save();ctx.translate(640,552);ctx.scale(1,.23);ctx.strokeStyle='#c18c6444';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,370,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,352,0,Math.PI*2);ctx.stroke();ctx.restore();
    for(const x of [230,1050]){glow(x,415,120,'#ff7b2824');ctx.fillStyle='#111b23';ctx.fillRect(x-8,443,16,60);polygon([[x-28,436],[x+28,436],[x+18,455],[x-18,455]],'#121c25');for(let i=0;i<5;i++){const w=Math.sin(t*8+i*1.8)*7;polygon([[x-19+i*7,437],[x-12+i*7+w,395+Math.sin(t*9+i)*16],[x-4+i*7,437]],i%2?'#ffc786':'#fa7948');}}
    for(const p of motes){const y=(p.y-t*p.s%660+660)%660;ctx.fillStyle=p.r>2?'#f5ae6e66':'#a9c5d433';ctx.fillRect(p.x+Math.sin(t+p.y)*15,y,p.r,p.r);}
    const vignette=ctx.createRadialGradient(640,350,100,640,350,760);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#0309129c');ctx.fillStyle=vignette;ctx.fillRect(0,0,1280,660);
  }
  // Input remains independent of characters. New fighters can consume it here.
  function action(type){if(mode!=='playing')return;$('.shell').dataset.lastAction=type;match.action(type);}
  const touchControls=AshControls.bind(document,input,action,()=>mode==='playing');
  function clearInput(){touchControls.reset();match.pending.length=0;delete $('.shell').dataset.lastAction;}
  function openMenu(screen='home'){
    clearInput();mode=screen==='paused'?'paused':'intro';$('.shell').dataset.state=mode;
    const overlay=$('#overlay');overlay.hidden=false;overlay.dataset.screen=screen;
    $('#help-panel').hidden=screen!=='help';$('#settings-panel').hidden=screen!=='settings';
    $('#start').hidden=screen==='help'||screen==='settings';
    $('#start').textContent=screen==='paused'?'ПРОДОЛЖИТЬ':'НАЧАТЬ БОЙ';
    $('#menu-help').hidden=screen!=='home';$('#menu-settings').hidden=screen!=='home';
    $('#menu-back').hidden=screen==='home'||screen==='paused';$('#menu-home').hidden=screen!=='paused';
    $('#message').textContent=screen==='paused'?'Арена на паузе.':screen==='help'?'Управление':screen==='settings'?'Настройки':'Тенетник против Иры · Храм водопадов · 90 секунд';
    silence();
  }
  function begin(){if(mode!=='paused'){match=new AshCombat.Match();visualTime=0;}accumulator=0;clearInput();mode='playing';hud();$('.shell').dataset.state=mode;$('#overlay').hidden=true;$('#pause').textContent='Ⅱ';unlockAudio();if(renderer3d){try{renderer3d.render({t:visualTime,match});}catch(error){console.warn(error);}}}
  function pause(){if(mode==='playing'){openMenu('paused');$('#pause').textContent='▶';}else if(mode==='paused')begin();}
  const keys={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyS:'block',ArrowDown:'block'},acts={KeyW:'jump',ArrowUp:'jump',Space:'jump',KeyJ:'punch',KeyK:'kick',KeyL:'special'};
  window.addEventListener('keydown',e=>{if(keys[e.code]||acts[e.code]||e.code==='Escape')e.preventDefault();if(mode==='playing'&&keys[e.code])touchControls.setKey(e.code,keys[e.code],true);if(!e.repeat&&acts[e.code])action(acts[e.code]);if(!e.repeat&&e.code==='Escape'){if(mode==='intro'&&$('#overlay').dataset.screen!=='home')openMenu();else pause();}});
  window.addEventListener('keyup',e=>{if(keys[e.code])touchControls.setKey(e.code,keys[e.code],false);});
  function deactivate(){clearInput();if(mode==='playing')pause();else silence();}
  window.addEventListener('blur',deactivate);document.addEventListener('visibilitychange',()=>{if(document.hidden)deactivate();});
  $('#start').onclick=begin;$('#menu-help').onclick=()=>openMenu('help');$('#menu-settings').onclick=()=>openMenu('settings');$('#menu-back').onclick=()=>openMenu();$('#menu-home').onclick=()=>openMenu();
  $('#pause').onclick=pause;$('#arena-pause').onclick=pause;$('#sound').onclick=toggleSound;$('#menu-sound').onclick=toggleSound;$('#arena-sound').onclick=toggleSound;
  $('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('.shell').requestFullscreen();}catch{$('#announcement').textContent='ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН';setTimeout(()=>$('#announcement').textContent='',1600);}};
  function frame(now){const dt=Math.min((now-last)/1000||0,.035);last=now;if(mode!=='paused'&&!document.hidden)visualTime+=dt;
    if(mode==='playing'&&!document.hidden){accumulator+=dt;while(accumulator>=AshCombat.STEP){match.step(input);accumulator-=AshCombat.STEP;for(const event of match.events)if(['hit','block','jump','flip','webshot','webhit','shatter'].includes(event))tone(event);if(match.result){finish();accumulator=0;break;}}hud();}
    if(window.AshAtlasStatus&&window.AshAtlasStatus.startsWith('error:'))$('#render-status').textContent='Не удалось загрузить спрайт · перезапустите игру';
    if(renderer3d){try{renderer3d.render({t:visualTime,match});}catch(error){console.warn('3D unavailable:',error.message);renderer3d=null;$('.shell').classList.remove('gl-mode');$('#render-status').textContent='2D · совместимый режим';}}
    if(!renderer3d){background(visualTime);$('#render-status').textContent='Нужен WebGL · включите аппаратное ускорение';}requestAnimationFrame(frame);
  }
  openMenu();hud();requestAnimationFrame(frame);
})();
