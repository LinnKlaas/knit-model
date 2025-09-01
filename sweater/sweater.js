import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export function initSweater(containerId) {
  const bodyGroups = [], sleeveGroups = [], collarGroups = [];
  let bodyMat, sleeveMat, collarMat, sweaterContainer;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, innerWidth/innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({antialias:true});
  const containerEl = document.getElementById(containerId);
  renderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
  renderer.setClearColor(0xffffff);
  containerEl.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff,0x444444,1));
  const dirLight = new THREE.DirectionalLight(0xffffff,1);
  dirLight.position.set(5,10,7.5); scene.add(dirLight);

  const controls = new OrbitControls(cam, renderer.domElement);
  const sleeveY=-37, collarY=-44.5;

  function repivot(mesh, align="top"){
    mesh.geometry.computeBoundingBox();
    const b=mesh.geometry.boundingBox, s=new THREE.Vector3();
    if(align==="top") s.y=-b.max.y;
    else if(align==="bottom") s.y=-b.min.y;
    else s.y=-(b.min.y+b.max.y)/2;
    mesh.geometry.translate(0,s.y,0);
  }

  const loader = new THREE.TextureLoader();
  const knitDiffuse = loader.load("https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/patentmuster.png");
  const knitNormal = loader.load("https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/Mat_0_normal.png");
  [knitDiffuse,knitNormal].forEach(t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(20,20);});

  new GLTFLoader().load("https://linnklaas.github.io/knit-model/sweater/scene.gltf",g=>{
    const model=g.scene; model.scale.set(1,1,1);
    bodyMat = new THREE.MeshStandardMaterial({map:knitDiffuse, normalMap:knitNormal, color:0xffffff, roughness:0.9, side:THREE.DoubleSide});
    sleeveMat = new THREE.MeshStandardMaterial({map:knitDiffuse.clone(), normalMap:knitNormal, color:0xffffff, roughness:0.9, side:THREE.DoubleSide});
    sleeveMat.map.center.set(0.5,0.5); sleeveMat.map.rotation=Math.PI/2;
    collarMat = bodyMat;

    sweaterContainer = new THREE.Group();

    [2,6].forEach(id=>{const p=model.getObjectByName(`Design_Piece_mat_${id}_Outside_Mat_0_0`); if(p){repivot(p,"top"); p.material=bodyMat; const g=new THREE.Group(); g.add(p); sweaterContainer.add(g); bodyGroups.push(g);}});
    [3,4].forEach((id,i)=>{const p=model.getObjectByName(`Design_Piece_mat_${id}_Outside_Mat_0_0`); if(p){repivot(p,"top"); p.material=sleeveMat; const g=new THREE.Group(); g.add(p); g.userData.side=i?-1:1; sweaterContainer.add(g); sleeveGroups.push(g);}});
    [0,5].forEach(id=>{const p=model.getObjectByName(`Design_Piece_mat_${id}_Outside_Mat_0_0`); if(p){repivot(p,"bottom"); p.material=collarMat; const g=new THREE.Group(); g.add(p); sweaterContainer.add(g); collarGroups.push(g);}});
    const extra=model.getObjectByName("Design_Piece_mat_1_Outside_Mat_0_0");
    if(extra){repivot(extra,"top"); extra.material=collarMat; const g=new THREE.Group(); g.add(extra); sweaterContainer.add(g); collarGroups.splice(1,0,g);}

    scene.add(sweaterContainer);
    const box=new THREE.Box3().setFromObject(sweaterContainer);
    const c = new THREE.Vector3();
    box.getCenter(c);
    sweaterContainer.position.sub(c);
    sweaterContainer.position.y += 11;
    const size=box.getSize(new THREE.Vector3());
    const dist=Math.max(size.x,size.y,size.z)/(2*Math.tan(cam.fov*Math.PI/360));
    cam.position.set(0,0,dist*1.5); cam.lookAt(0,0,0); controls.update();
  });

  function updateUI(){
    const bw=+bodyW.value, bh=+bodyH.value, sw=+slvW.value, sh=+slvH.value, cw=+colW.value, ch=+colH.value;
    bodyGroups.forEach(g=>g.scale.set(bw,bh,1));
    let bbox=new THREE.Box3(); bodyGroups.forEach(g=>bbox.union(new THREE.Box3().setFromObject(g)));
    const top=bbox.max.y, half=(bbox.max.x-bbox.min.x)/2-21.7;
    sleeveGroups.forEach(g=>{g.scale.set(sw,sh,1); g.position.y=top+sleeveY; g.position.x=half*g.userData.side;});
    collarGroups.forEach((g,i)=>{if(!g||!g.children.length)return; g.children[0].scale.set(cw*bw,ch*bh,1); if(!g.children[0].geometry.boundingBox) g.children[0].geometry.computeBoundingBox(); g.position.y=i===1?top-31.6+(g.children[0].geometry.boundingBox.max.y-g.children[0].geometry.boundingBox.min.y):top+collarY;});
    if(bodyMat) bodyMat.color.set(color.value); if(sleeveMat) sleeveMat.color.set(color.value);
  }

  (function animate(){ requestAnimationFrame(animate); updateUI(); controls.update(); renderer.render(scene,cam); })();
}
