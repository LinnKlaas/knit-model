// sweater.js
// Main sweater 3D viewer logic using Three.js
// Author: You :)

import * as THREE from "https://esm.sh/three@0.160.0";
import { GLTFLoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

/**
 * Initialize sweater viewer inside a given container
 * @param {string} containerId - DOM element ID where the canvas will be mounted
 */
export function initSweater(containerId) {
  // Groups for body, sleeves, collar
  let bodyGroups = [];
  let sleeveGroups = [];
  let collarGroups = [];

  let bodyMaterial, sleeveMaterial, collarMaterial;
  let sweaterContainer;

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60,
    innerWidth / innerHeight,
    0.1,
    1000
  );
  const renderer = new THREE.WebGLRenderer({ antialias: true });

  const containerEl = document.getElementById(containerId);
  renderer.setSize(innerWidth - 250, innerHeight);
  renderer.setClearColor(0xffffff);
  containerEl.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7.5);
  scene.add(dirLight);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);

  const sleeveYOffset = -37;
  const collarYOffset = -44.5;

  // Helper: repivot geometry around top/bottom/center
  function repivot(mesh, align = "top") {
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    const shift = new THREE.Vector3();

    if (align === "top") shift.y = -bbox.max.y;
    else if (align === "bottom") shift.y = -bbox.min.y;
    else shift.y = -(bbox.min.y + bbox.max.y) / 2;

    mesh.geometry.translate(0, shift.y, 0);
  }

  // Load textures
  const texLoader = new THREE.TextureLoader();
  const knitDiffuse = texLoader.load(
    "https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/patentmuster.png"
  );
  const knitNormal = texLoader.load(
    "https://raw.githubusercontent.com/LinnKlaas/knit-model/main/sweater/textures/Mat_0_normal.png"
  );

  [knitDiffuse, knitNormal].forEach((tx) => {
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.repeat.set(20, 20);
  });

  // Load model
  new GLTFLoader().load(
    "https://linnklaas.github.io/knit-model/sweater/scene.gltf",
    (gltf) => {
      const model = gltf.scene;
      model.scale.set(0, 0, 0);

      // Materials
      bodyMaterial = new THREE.MeshStandardMaterial({
        map: knitDiffuse,
        normalMap: knitNormal,
        color: 0xffffff,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });

      sleeveMaterial = new THREE.MeshStandardMaterial({
        map: knitDiffuse.clone(),
        normalMap: knitNormal,
        color: 0xffffff,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      sleeveMaterial.map.center.set(0.5, 0.5);
      sleeveMaterial.map.rotation = Math.PI / 2; // rotate pattern on sleeves

      collarMaterial = bodyMaterial; // collar uses same material

      // Container for all parts
      sweaterContainer = new THREE.Group();

      // Body parts
      [2, 6].forEach((id) => {
        const part = model.getObjectByName(
          `Design_Piece_mat_${id}_Outside_Mat_0_0`
        );
        if (part) {
          repivot(part, "top");
          part.material = bodyMaterial;
          const group = new THREE.Group();
          group.add(part);
          sweaterContainer.add(group);
          bodyGroups.push(group);
        }
      });

      // Sleeves
      [3, 4].forEach((id, idx) => {
        const part = model.getObjectByName(
          `Design_Piece_mat_${id}_Outside_Mat_0_0`
        );
        if (part) {
          repivot(part, "top");
          part.material = sleeveMaterial;
          const group = new THREE.Group();
          group.add(part);
          group.userData.side = idx ? -1 : 1; // left / right
          sweaterContainer.add(group);
          sleeveGroups.push(group);
        }
      });

      // Collars
      [0, 5].forEach((id) => {
        const part = model.getObjectByName(
          `Design_Piece_mat_${id}_Outside_Mat_0_0`
        );
        if (part) {
          repivot(part, "bottom");
          part.material = collarMaterial;
          const group = new THREE.Group();
          group.add(part);
          sweaterContainer.add(group);
          collarGroups.push(group);
        }
      });

      const extraCollar = model.getObjectByName(
        "Design_Piece_mat_1_Outside_Mat_0_0"
      );
      if (extraCollar) {
        repivot(extraCollar, "top");
        extraCollar.material = collarMaterial;
        const group = new THREE.Group();
        group.add(extraCollar);
        sweaterContainer.add(group);
        collarGroups.splice(1, 0, group);
      }

      // Add to scene
      scene.add(sweaterContainer);

      // Center and fit camera
      const bbox = new THREE.Box3().setFromObject(sweaterContainer);
      const center = bbox.getCenter(new THREE.Vector3());
      sweaterContainer.position.sub(center);
      sweaterContainer.position.y += 11;

      const size = bbox.getSize(new THREE.Vector3());
      const dist =
        Math.max(size.x, size.y, size.z) /
        (2 * Math.tan((camera.fov * Math.PI) / 360));
      camera.position.set(0, 0, dist * 1.5);
      camera.lookAt(0, 0, 0);
      controls.update();
    }
  );

  // Update scales and colors from UI sliders
  function updateFromUI() {
    const bw = +bodyW.value,
      bh = +bodyH.value,
      sw = +slvW.value,
      sh = +slvH.value,
      cw = +colW.value,
      ch = +colH.value;

    // Body
    bodyGroups.forEach((g) => g.scale.set(bw, bh, 1));

    // Get top Y for positioning sleeves + collar
    let bbox = new THREE.Box3();
    bodyGroups.forEach((g) => bbox.union(new THREE.Box3().setFromObject(g)));
    const topY = bbox.max.y;
    const halfWidth = (bbox.max.x - bbox.min.x) / 2 - 21.7;

    // Sleeves
    sleeveGroups.forEach((g) => {
      g.scale.set(sw, sh, 1);
      g.position.y = topY + sleeveYOffset;
      g.position.x = halfWidth * g.userData.side;
    });

    // Collars
    collarGroups.forEach((g, i) => {
      if (!g || !g.children.length) return;
      g.children[0].scale.set(cw * bw, ch * bh, 1);
      if (!g.children[0].geometry.boundingBox)
        g.children[0].geometry.computeBoundingBox();

      g.position.y =
        i === 1
          ? topY -
            31.6 +
            (g.children[0].geometry.boundingBox.max.y -
              g.children[0].geometry.boundingBox.min.y)
          : topY + collarYOffset;
    });

    if (bodyMaterial) bodyMaterial.color.set(color.value);
    if (sleeveMaterial) sleeveMaterial.color.set(color.value);
  }
  // Animation loop
  (function animate() {
    requestAnimationFrame(animate);
    updateFromUI();
    controls.update();
    renderer.render(scene, camera);
  })();
}
