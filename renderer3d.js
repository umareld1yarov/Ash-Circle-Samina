/* Babylon.js: two 2D sprite atlas fighters and silk effects. */
(function(root){
  'use strict';
  class AshRenderer3D{
    constructor(canvas){
      const B=BABYLON;this.B=B;this.canvas=canvas;
      this.engine=new B.Engine(canvas,true,{alpha:true,stencil:true,preserveDrawingBuffer:true});this.engine.setHardwareScalingLevel(Math.max(1,(window.devicePixelRatio||1)/1.5));
      this.scene=new B.Scene(this.engine);this.scene.clearColor=new B.Color4(0,0,0,0);
      this.camera=new B.FreeCamera('side-camera',new B.Vector3(0,3.5,-22),this.scene);this.camera.setTarget(new B.Vector3(0,2.5,0));this.camera.mode=B.Camera.ORTHOGRAPHIC_CAMERA;
      const sky=new B.HemisphericLight('moon',new B.Vector3(-.4,1,-.5),this.scene);sky.intensity=.9;sky.groundColor=B.Color3.FromHexString('#28313d');
      const light=new B.DirectionalLight('warm-rim',new B.Vector3(-1,-2,1),this.scene);light.intensity=1.0;light.diffuse=B.Color3.FromHexString('#ffbd8a');
      this.models=[this.spriteFighter('weaver','AshWeaverAtlas',[.85,.55,1]),this.spriteFighter('jade','AshJadeAtlas',[.55,1,.85])];
      this.effects=this.models.map((_,i)=>{const m=this.material('spark'+i,'#ffe0a1');m.emissiveColor=B.Color3.FromHexString('#ff9c46');const mesh=B.MeshBuilder.CreateTorus('impact'+i,{diameter:.7,thickness:.045,tessellation:20},this.scene);mesh.material=m;mesh.isVisible=false;return mesh;});
      this.resize=()=>{this.engine.resize();const aspect=canvas.clientWidth/canvas.clientHeight;const halfW=Math.max(7.3,3.9*aspect),halfH=halfW/aspect;this.camera.orthoLeft=-halfW;this.camera.orthoRight=halfW;this.camera.orthoTop=halfH;this.camera.orthoBottom=-halfH;};
      this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);this.resize();
    }
    material(name,color){const B=this.B,m=new B.StandardMaterial(name,this.scene);m.diffuseColor=B.Color3.FromHexString(color);m.specularColor=new B.Color3(.22,.22,.25);return m;}
    spriteFighter(name,dataKey,hitTint){
      const B=this.B;
      const rig=new B.TransformNode(name+'-root',this.scene);
      const sprite=B.MeshBuilder.CreatePlane(name+'-2d-sprite',{width:3.1,height:3.1,sideOrientation:B.Mesh.DOUBLESIDE},this.scene);
      sprite.parent=rig;sprite.position.y=1.35;sprite.billboardMode=B.Mesh.BILLBOARDMODE_ALL;
      window.AshAtlasStates=window.AshAtlasStates||{};window.AshAtlasStates[name]='loading';
      const updateStatus=()=>{const states=Object.values(window.AshAtlasStates);window.AshAtlasStatus=states.find(s=>s.startsWith('error:'))||(states.every(s=>s==='ready')?'ready':'loading');};
      const loaded=()=>{window.AshAtlasStates[name]='ready';updateStatus();this.scene.executeWhenReady(()=>{if(this.lastRender)this.render(this.lastRender);});};
      const failed=message=>{window.AshAtlasStates[name]='error: '+name+' '+message;updateStatus();};
      const atlas=window[dataKey]?B.Texture.CreateFromBase64String(window[dataKey],name+'-atlas',this.scene,false,true,B.Texture.BILINEAR_SAMPLINGMODE,loaded,failed):new B.Texture('assets/'+name+'-atlas.png',this.scene,false,true,B.Texture.BILINEAR_SAMPLINGMODE,loaded,failed);
      atlas.wrapU=atlas.wrapV=B.Texture.CLAMP_ADDRESSMODE;
      const material=new B.ShaderMaterial(name+'-atlas-material',this.scene,{
        vertexSource:'precision highp float; attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; uniform float spin; varying vec2 vUV; void main(){vUV=uv;float c=cos(spin),s=sin(spin);vec3 p=position;p.xy=mat2(c,s,-s,c)*p.xy;gl_Position=worldViewProjection*vec4(p,1.0);}',
        fragmentSource:'precision highp float; varying vec2 vUV; uniform sampler2D atlas; uniform vec2 cell; uniform float flash; uniform vec3 hitTint; void main(){vec4 c=texture2D(atlas,vec2(vUV.x*.25+cell.x*.25,vUV.y*.5+(1.0-cell.y)*.5)); if(c.a<.78) discard;gl_FragColor=vec4(mix(c.rgb,hitTint,flash),1.0);}'
      },{attributes:['position','uv'],uniforms:['worldViewProjection','cell','flash','hitTint','spin'],samplers:['atlas']});
      material.setTexture('atlas',atlas);material.setVector2('cell',new B.Vector2(0,0));material.setFloat('flash',0);material.setFloat('spin',0);material.setVector3('hitTint',new B.Vector3(...hitTint));sprite.material=material;
      const shadow=B.MeshBuilder.CreateDisc(name+'-shadow',{radius:.6,tessellation:32},this.scene);shadow.rotation.x=Math.PI/2;shadow.position.y=.015;shadow.scaling.y=.45;shadow.material=this.material(name+'-shadow-material','#050b10');shadow.material.alpha=.42;
      return {root:rig,sprite,material,shadow};
    }
    webEffects(match,t){
      const B=this.B;this.webMeshes=this.webMeshes||new Map();const active=new Set();
      const draw=(key,points,color)=>{active.add(key);let mesh=this.webMeshes.get(key);if(mesh)B.MeshBuilder.CreateLines(key,{points,instance:mesh});else{mesh=B.MeshBuilder.CreateLines(key,{points,updatable:true},this.scene);mesh.color=B.Color3.FromHexString(color);mesh.isPickable=false;this.webMeshes.set(key,mesh);}};
      for(const bolt of match.projectiles){const dir=Math.sign(bolt.vx);for(let strand=0;strand<3;strand++){const points=[];for(let j=0;j<9;j++)points.push(new B.Vector3(bolt.x-dir*j*.11,bolt.y+Math.sin(j*1.5+t*20+strand)*.045+strand*.035,-.6));draw('silk-'+bolt.id+'-'+strand,points,strand===1?'#ffffff':'#cb88ff');}}
      match.fighters.forEach((f,i)=>{if(!f.webbed)return;for(let band=0;band<5;band++){const points=[];for(let j=0;j<=24;j++){const a=j/24*Math.PI*2;points.push(new B.Vector3(f.x+Math.cos(a)*(.48-band*.02),f.y+.55+band*.3+Math.sin(a*2)*.12,-.3+Math.sin(a)*.35));}draw('cocoon-'+i+'-'+band,points,'#e4cbff');}});
      for(const [key,mesh] of this.webMeshes)if(!active.has(key)){mesh.dispose();this.webMeshes.delete(key);}
    }
    render({t,match}){this.lastRender={t,match};
      match.fighters.forEach((f,i)=>{const m=this.models[i],B=this.B;
        {
          let frame=0;const attackMove=f.attack?AshCombat.move(f):null;
          if(f.attack){const active=f.age>=attackMove.wind-3&&f.age<attackMove.wind+attackMove.active+8;frame=active?(f.attack==='punch'?2:f.attack==='kick'?3:6):0;}
          else if(f.state==='block')frame=4;else if(f.state==='hurt'||f.state==='ko')frame=7;else if(f.y>0)frame=5;else if(f.state==='walk')frame=Math.floor(f.walk/9)%2;
          const flip=f.flipRemaining>0&&f.y>0&&f.state!=='hurt'&&f.state!=='ko';
          const progress=flip?(30-f.flipRemaining)/30:0;const eased=progress*progress*(3-2*progress);
          m.material.setFloat('spin',flip?-f.flipDir*f.face*Math.PI*2*eased:0);
          m.material.setVector2('cell',new B.Vector2(frame%4,Math.floor(frame/4)));m.material.setFloat('flash',f.flash>0?.35:0);
          m.root.position.set(f.x,f.y+(f.state==='idle'?Math.sin(t*3)*.018:0),-.1);m.sprite.scaling.x=f.face;
          m.root.rotation.z=f.state==='ko'?-f.face*1.25:0;if(f.state==='ko')m.root.position.y=.3;
          m.shadow.position.x=f.x;m.shadow.visibility=Math.max(.15,1-f.y*.25);this.effects[i].isVisible=false;return;
        }
      });this.webEffects(match,t);this.scene.render();
    }
  }
  root.AshRenderer3D=AshRenderer3D;
})(window);
