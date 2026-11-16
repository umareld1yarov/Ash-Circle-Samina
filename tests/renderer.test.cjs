const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const BABYLON=require('../vendor/babylon.js'),AshCombat=require('../combat.js');
const headless=Object.create(BABYLON);Object.defineProperty(headless,'Engine',{value:BABYLON.NullEngine});
const window={devicePixelRatio:1};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../renderer3d.js'),'utf8'),{window,BABYLON:headless,AshCombat,ResizeObserver:class{observe(){}}});
const renderer=new window.AshRenderer3D({clientWidth:1280,clientHeight:660});
const match=new AshCombat.Match();
for(const state of ['idle','walk','jump','block','hurt','ko']){for(const f of match.fighters)f.state=state;renderer.render({t:1,match});}
for(const attack of Object.keys(AshCombat.MOVES))for(const f of match.fighters){f.state=attack;f.attack=attack;f.age=AshCombat.MOVES[attack].wind;renderer.render({t:2,match});}
assert.ok(renderer.models[0].sprite);assert.equal(renderer.models[0].sprite.material.getClassName(),'ShaderMaterial');assert.ok(renderer.models[1].sprite);assert.equal(renderer.models[1].sprite.name,'jade-2d-sprite');assert.equal(renderer.models[1].sprite.material.getClassName(),'ShaderMaterial');assert.equal(renderer.scene.meshes.filter(m=>m.name.endsWith('-2d-sprite')).length,2);
for(const [i,f] of match.fighters.entries()){f.attack='kick';f.age=AshCombat.MOVES.kick.wind;f.face=i===0?1:-1;}renderer.render({t:2.5,match});
for(const [i,m] of renderer.models.entries()){assert.equal(m.material._vectors2.cell.x,3);assert.equal(m.material._vectors2.cell.y,0);assert.equal(m.sprite.scaling.x,i===0?1:-1);}
match.fighters[1].webbed=40;match.projectiles=[{id:1,x:0,y:1.4,vx:10}];renderer.render({t:3,match});assert.equal(renderer.webMeshes.size,8);match.fighters[1].webbed=0;match.projectiles=[];renderer.render({t:4,match});assert.equal(renderer.webMeshes.size,0);
for(const f of match.fighters){f.attack=null;f.state='jump';f.y=2;f.flipRemaining=15;f.flipDir=-1;}renderer.render({t:5,match});for(const [i,m] of renderer.models.entries()){assert.ok(Math.abs(Math.abs(m.material._floats.spin)-Math.PI)<1e-6);assert.equal(m.material._vectors2.cell.x,1);assert.equal(m.material._vectors2.cell.y,1);}for(const f of match.fighters){f.y=0;f.flipRemaining=0;}renderer.render({t:6,match});for(const m of renderer.models)assert.equal(m.material._floats.spin,0);
assert.equal(renderer.models.length,2);assert.equal(renderer.camera.mode,BABYLON.Camera.ORTHOGRAPHIC_CAMERA);renderer.engine.dispose();
console.log('OK: Babylon scene, two 2D atlas fighters and mirrored attack poses, camera, state/attack poses, projectile/cocoon lifecycle and render via NullEngine');
