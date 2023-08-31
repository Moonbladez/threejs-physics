import "./style.css";

import * as CANNON from "cannon-es";
import { GUI } from "lil-gui";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface ObjectToUpdate {
  mesh: THREE.Mesh;
  body: CANNON.Body;
}

// Disable color management
THREE.ColorManagement.enabled = false;

/**
 * Debug
 */
const gui: GUI = new GUI();
const debugObject = {
  createSphere: () => {
    createSphere(Math.random() * 0.5, new THREE.Vector3((Math.random() - 0.5) * 3, 4, (Math.random() - 0.5) * 3));
  },
  createBox: () => {
    createBox(
      Math.random() * 0.5,
      Math.random() * 0.5,
      Math.random() * 0.5,
      new THREE.Vector3((Math.random() - 0.5) * 3, 4, (Math.random() - 0.5) * 3)
    );
  },
  reset: () => {
    for (const object of objectsToUpdate) {
      object.body.removeEventListener("collide", playHitSound);
      scene.remove(object.mesh);
    }

    objectsToUpdate.splice(0, objectsToUpdate.length);
  },
};
gui.add(debugObject, "createSphere").name("Add sphere");
gui.add(debugObject, "createBox").name("Add box");
gui.add(debugObject, "reset").name("Reset");

/**
 * Base
 */
// Canvas
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

// Scene
const scene: THREE.Scene = new THREE.Scene();

/**
 * Sounds
 */
const hitSound: HTMLAudioElement = new Audio("/sounds/hit.mp3");

const playHitSound = (collision: any) => {
  const impactStrength: number = collision.contact.getImpactVelocityAlongNormal();
  if (impactStrength > 1.5) {
    hitSound.volume = Math.random();
    hitSound.currentTime = 0;
    hitSound.play();
  }
};
/**
 * Textures
 */
const textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
const cubeTextureLoader: THREE.CubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture: THREE.CubeTexture = cubeTextureLoader.load([
  "/textures/environmentMaps/0/px.png",
  "/textures/environmentMaps/0/nx.png",
  "/textures/environmentMaps/0/py.png",
  "/textures/environmentMaps/0/ny.png",
  "/textures/environmentMaps/0/pz.png",
  "/textures/environmentMaps/0/nz.png",
]);

/**
 * Physics
 */
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.allowSleep = true;
world.broadphase = new CANNON.SAPBroadphase(world);

// Materials
const defaultMaterial: CANNON.Material = new CANNON.Material("default");

const defaultContactMaterial: CANNON.ContactMaterial = new CANNON.ContactMaterial(defaultMaterial, defaultMaterial, {
  friction: 0.1,
  restitution: 0.6,
});
world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

// FLOOR
const floorShape: CANNON.Plane = new CANNON.Plane();
const floorBody: CANNON.Body = new CANNON.Body({
  shape: floorShape,
});
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

/**
 * Floor
 */
const floor: THREE.Mesh = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: "#777777",
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes: { width: number; height: number } = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.set(-3, 3, 3);
scene.add(camera);

// Controls
const controls: OrbitControls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Utils
const objectsToUpdate: ObjectToUpdate[] = [];

const sphereGeometry: THREE.SphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
});

const boxGeometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial: THREE.MeshStandardMaterial = new THREE.MeshStandardMaterial({
  metalness: 1,
  roughness: 1,

  envMap: environmentMapTexture,
});

const createSphere = (radius: number, position: THREE.Vector3): void => {
  const mesh: THREE.Mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.scale.set(radius, radius, radius);
  mesh.castShadow = true;
  mesh.position.copy(position);
  scene.add(mesh);

  const shape: CANNON.Sphere = new CANNON.Sphere(radius);
  const body: CANNON.Body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position as unknown as CANNON.Vec3);
  body.addEventListener("collide", playHitSound);
  world.addBody(body);

  objectsToUpdate.push({ mesh, body });
};

const createBox = (width: number, height: number, depth: number, position: THREE.Vector3): void => {
  const mesh: THREE.Mesh = new THREE.Mesh(boxGeometry, boxMaterial);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.position.copy(position);
  scene.add(mesh);

  const shape: CANNON.Box = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5));
  const body: CANNON.Body = new CANNON.Body({
    mass: 2,
    position: new CANNON.Vec3(position.x, position.y, position.z),
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position as unknown as CANNON.Vec3);
  body.addEventListener("collide", playHitSound);
  world.addBody(body);

  objectsToUpdate.push({ mesh, body });
};

/**
 * Animate
 */
const clock: THREE.Clock = new THREE.Clock();
let oldElapsedTime: number = 0;

const tick = () => {
  const elapsedTime: number = clock.getElapsedTime();
  const deltaTime: number = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  // Update physics
  world.step(1 / 60, deltaTime, 3);

  for (const object of objectsToUpdate) {
    object.mesh.position.copy(object.body.position as unknown as THREE.Vector3);
    object.mesh.quaternion.copy(object.body.quaternion as unknown as THREE.Quaternion);
  }

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
