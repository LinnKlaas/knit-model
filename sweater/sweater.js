// sweater.js
import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export function mount(container) {
  // Prevent double mounting
  if (!container) return;
  if (container.__sweaterMounted) return;
  container.__sweaterMounted = true;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0xffffff);
  container.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
  const dl = new THREE.DirectionalLight(0xffffff, 1);
  dl.position.set(5, 10, 7.5);
  scene.add(dl);

  // Orbit controls
  const controls = new OrbitControls(camera, renderer.domElement);

  // Groups
  const body = [], sleeves = [], collar = [];
  let matBody, matSleeve;
  const sleeveY = -37, collarY = -44.5;

  function rePivot(mesh, align = "top") {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const shift = new THREE.Vector3();
    if (align === "top") shift.y = -box.max.y;
    else if (align === "bottom") shift.y = -box.min.y;
    else shift.y = -(box.min.y + box.max.y) / 2;
    mesh.geometry.translate(0, shift.y, 0);
  }

  // Textures
  const loader = new THREE.TextureLoader();
  const knit = loader.load("https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/patentmuster.png");
  const knitNormal = loader.load("https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/Mat_0_normal.png");
  [knit, knitNormal].forEach(tx => {
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(20, 20);
  });

  // Load model
  new GLTFLoader().load("https://linnklaas.github.io/knit-model/sweater/scene.gltf", (gltf) => {
    const model = gltf.scene;
    model.scale.set(0, 0, 0);

    matBody = new THREE.MeshStandardMaterial({
      map: knit,
      normalMap: knitNormal,
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    matSleeve = new THREE.MeshStandardMaterial({
      map: knit.clone(),
      normalMap: knitNormal,
      color: 0xffffff,
      roughness: 0.9,
      side: THREE.DoubleSide
    });
    matSleeve.map.center.set(0.5, 0.5);
    matSleeve.map.rotation = Math.PI / 2;

    const matCollar = matBody; // collar same material

    const group = new THREE.Group();

    // Body
    [2, 6].forEach(i => {
      const part = model.getObjectByName(`Design_Piece_mat_${i}_Outside_Mat_0_0`);
      if (part) {
        rePivot(part, "top");
        part.material = matBody;
        const g = new THREE.Group();
        g.add(part);
        group.add(g);
        body.push(g);
      }
    });

    // Sleeves
    [3, 4].forEach((i, idx) => {
      const part = model.getObjectByName(`Design_Piece_mat_${i}_Outside_Mat_0_0`);
      if (part) {
        rePivot(part, "top");
        part.material = matSleeve;
        const g = new THREE.Group();
        g.add(part);
        g.userData.side = idx ? -1 : 1;
        group.add(g);
        sleeves.push(g);
      }
    });

    // Collar
    [0, 5].forEach(i => {
      const part = model.getObjectByName(`Design_Piece_mat_${i}_Outside_Mat_0_0`);
      if (part) {
        rePivot(part, "bottom");
        part.material = matCollar;
        const g = new THREE.Group();
        g.add(part);
        group.add(g);
        collar.push(g);
      }
    });
    const c1 = model.getObjectByName("Design_Piece_mat_1_Outside_Mat_0_0");
    if (c1) {
      rePivot(c1, "top");
      c1.material = matCollar;
      const g = new THREE.Group();
      g.add(c1);
      group.add(g);
      collar.splice(1, 0, g);
    }

    scene.add(group);

    // Center model
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    group.position.sub(center);
    group.position.y += 11;
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) / (2 * Math.tan(camera.fov * Math.PI / 360));
    camera.position.set(0, 0, dist * 1.5);
    camera.lookAt(0, 0, 0);
    controls.update();

    // Update loop
    function update() {
      const bw = +document.getElementById("bodyW")?.value || 1;
      const bh = +document.getElementById("bodyH")?.value || 1;
      const sw = +document.getElementById("slvW")?.value || 1;
      const sh = +document.getElementById("slvH")?.value || 1;
      const cw = +document.getElementById("colW")?.value || 1;
      const ch = +document.getElementById("colH")?.value || 1;
      const colVal = document.getElementById("color")?.value || "#DD7664";

      body.forEach(g => g.scale.set(bw, bh, 1));

      let bb = new THREE.Box3();
      body.forEach(g => bb.union(new THREE.Box3().setFromObject(g)));
      const top = bb.max.y;
      const half = (bb.max.x - bb.min.x) / 2 - 21.7;

      sleeves.forEach(g => {
        g.scale.set(sw, sh, 1);
        g.position.y = top + sleeveY;
        g.position.x = half * g.userData.side;
      });

      collar.forEach((g, i) => {
        if (!g || !g.children.length) return;
        g.children[0].scale.set(cw * bw, ch * bh, 1);
        if (!g.children[0].geometry.boundingBox) g.children[0].geometry.computeBoundingBox();
        g.position.y = i == 1
          ? top - 31.6 + (g.children[0].geometry.boundingBox.max.y - g.children[0].geometry.boundingBox.min.y)
          : top + collarY;
      });

      if (matBody) matBody.color.set(colVal);
      if (matSleeve) matSleeve.color.set(colVal);
    }

    function animate() {
      requestAnimationFrame(animate);
      update();
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
  });

  // Store cleanup
  container.__sweaterUnmount = () => {
    container.innerHTML = "";
    container.__sweaterMounted = false;
  };
}

export function unmount(container) {
  if (container?.__sweaterUnmount) {
    container.__sweaterUnmount();
  }
}
