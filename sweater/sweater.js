// sweater.js
import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export function initSweater(containerId) {
  let body = [], slv = [], col = [], matB, matS, container, collarGroup;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
  const rend = new THREE.WebGLRenderer({ antialias: true });
  rend.setSize(window.innerWidth - 250, window.innerHeight);
  rend.setClearColor(0xffffff);
  document.getElementById(containerId).appendChild(rend.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
  const dl = new THREE.DirectionalLight(0xffffff, 1);
  dl.position.set(5, 10, 7.5);
  scene.add(dl);

  const ctr = new OrbitControls(cam, rend.domElement);
  const sleeveY = -33, collarY = -44.5;
  const overallScale = 0.8, sleeveOffsetX = 4.2;

  const t = new THREE.TextureLoader(),
        knit = t.load("https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/patentmuster.png"),
        knitN = t.load("https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/Mat_0_normal.png");
  [knit, knitN].forEach(tx => { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(20, 20); });

  function rePivot(m,a="top"){ m.geometry.computeBoundingBox(); const b=m.geometry.boundingBox; const s=new THREE.Vector3();
    s.y = a==="top"?-b.max.y:a==="bottom"?-b.min.y:-(b.min.y+b.max.y)/2; m.geometry.translate(0,s.y,0); }

  new GLTFLoader().load("https://linnklaas.github.io/knit-model/sweater/scene.gltf", g => {
    const m = g.scene; m.scale.set(1,1,1);
    matB = new THREE.MeshStandardMaterial({ map: knit, normalMap: knitN, color: 0xffffff, roughness: .9, side: THREE.DoubleSide });
    matS = new THREE.MeshStandardMaterial({ map: knit.clone(), normalMap: knitN, color: 0xffffff, roughness: .9, side: THREE.DoubleSide });
    matS.map.center.set(.5,.5); matS.map.rotation = Math.PI/2;
    const matC = matB; container = new THREE.Group(); collarGroup = new THREE.Group();

    [2,6].forEach(i=>{const p=m.getObjectByName(`Design_Piece_mat_${i}_Outside_Mat_0_0`); if(p){rePivot(p,"top"); p.material=matB; const g=new THREE.Group(); g.add(p); container.add(g); body.push(g);}});
    [3,4].forEach((i,x)=>{const p=m.getObjectByName(`Design_Piece_mat_${i}_Outside_Mat_0_0`); if(p){p.geometry.computeBoundingBox(); const bb=p.geometry.boundingBox;
      const shift = new THREE.Vector3(-(bb.min.x+bb.max.x)/2,-bb.max.y,0); p.geometry.translate(shift.x,shift.y,shift.z); p.material=matS;
      const inner=new THREE.Group(); inner.add(p); const outer=new THREE.Group(); outer.add(inner); outer.userData={side:x?-1:1,inner}; container.add(outer); slv.push(outer); }});
    [0,5].forEach(i=>{const p=m.getObjectByName(`Design_Piece_mat_${i}_Outside_Mat_0_0`); if(p){rePivot(p,"bottom"); p.material=matC; const g=new THREE.Group(); g.add(p); collarGroup.add(g); col.push(g);}});
    const p1 = m.getObjectByName("Design_Piece_mat_1_Outside_Mat_0_0"); if(p1){rePivot(p1,"top"); p1.material=matC; const g=new THREE.Group(); g.add(p1); g.position.y+=15.7; collarGroup.add(g); col.splice(1,0,g); }

    container.add(collarGroup); scene.add(container);
    container.scale.set(overallScale,overallScale,overallScale);

    const boxAll=new THREE.Box3().setFromObject(container), cPtAll=boxAll.getCenter(new THREE.Vector3());
    container.position.sub(cPtAll); container.position.y += 11;

    const boxC=new THREE.Box3().setFromObject(collarGroup), cPtC=boxC.getCenter(new THREE.Vector3());
    collarGroup.position.sub(cPtC); collarGroup.position.y+=-8.7;

    const s=boxAll.getSize(new THREE.Vector3()), dist=Math.max(s.x,s.y,s.z)/(2*Math.tan(cam.fov*Math.PI/360));
    cam.position.set(0,0,dist*1.5); cam.lookAt(0,0,0); ctr.update();

    function upd(){
      const bw=1, bh=1, sw=1, sh=1, cw=1, ch=1;
      body.forEach(g=>g.scale.set(bw,bh,1));
      let bb2=new THREE.Box3(); body.forEach(g=>bb2.union(new THREE.Box3().setFromObject(g)));
      const top=bb2.max.y, bodyHalf=(bb2.max.x-bb2.min.x)/2;
      slv.forEach(g=>{g.position.y=top+sleeveY; g.position.x=(bodyHalf+sleeveOffsetX)*g.userData.side; g.userData.inner.scale.set(sw,sh,1);});
      if(collarGroup) collarGroup.scale.set(cw*bw,ch*bh,1);
    }
    (function anim(){ requestAnimationFrame(anim); upd(); ctr.update(); rend.render(scene,cam); })();
  });
}
