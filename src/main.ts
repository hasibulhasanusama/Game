
import * as THREE from 'three';
import './style.css';
import { World, type ResourceNode } from './game/World';
import { Player } from './game/Player';

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
const scene = new THREE.Scene();

scene.background = new THREE.Color('#91b7a0');
scene.fog = new THREE.FogExp2('#91b7a0', 0.0028);

const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  600
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const world = new World(scene);
const player = new Player(scene, camera, canvas, world);

let health = 100;
let hunger = 86;
let thirst = 92;
let wood = 0;
let stone = 0;
let treeSeeds = 10;
let collectedCount = 0;

let gameStarted = false;
let paused = false;
let lastTime = 0;
let survivalTick = 0;
let toastTimer: number | undefined;
let interactionTarget: ResourceNode | null = null;
let previousE = false;

const $ = <T extends HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

const startOverlay = $('#start-overlay');
const pauseOverlay = $('#pause-overlay');
const interactionHint = $('#interaction-hint');
const interactionText = $('#interaction-text');
const toast = $('#toast');

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimer) window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2300);
}

function setMeter(name: string, value: number) {
  const safe = Math.max(0, Math.min(100, value));

  $<HTMLElement>(`#${name}-value`).textContent =
    String(Math.round(safe));

  $<HTMLElement>(`#${name}-bar`).style.width = `${safe}%`;
}

function updateHUD() {
  setMeter('health', health);
  setMeter('hunger', hunger);
  setMeter('thirst', thirst);
  setMeter('stamina', player.currentStamina);

  $('#wood-count').textContent = String(wood);
  $('#stone-count').textContent = String(stone);

  $('#objective-count').textContent =
    `${Math.min(collectedCount, 5)} / 5`;

  $('#objective-progress').style.width =
    `${Math.min(collectedCount, 5) * 20}%`;

  const p = player.position;

  $('#coordinates').textContent =
    `X ${Math.round(p.x).toString().padStart(3, '0')} · ` +
    `Z ${Math.round(p.z).toString().padStart(3, '0')}`;

  const seedCounter = document.querySelector<HTMLElement>('#seed-count');
  if (seedCounter) seedCounter.textContent = String(treeSeeds);

  const plantedCounter = document.querySelector<HTMLElement>('#planted-count');
  if (plantedCounter) {
    plantedCounter.textContent = String(world.plantedTreeCount);
  }
}

function findNearbyResource(): ResourceNode | null {
  let nearest: ResourceNode | null = null;
  let nearestDistance = 3.6;

  for (const resource of world.resources) {
    if (resource.collected) continue;

    const distance = player.position.distanceTo(resource.mesh.position);

    if (distance < nearestDistance) {
      nearest = resource;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function collectResource(resource: ResourceNode) {
  resource.collected = true;
  resource.mesh.visible = false;

  if (resource.kind === 'wood') {
    wood += resource.amount;
    showToast(`Collected ${resource.amount} wood.`);
  } else {
    stone += resource.amount;
    showToast(`Collected ${resource.amount} stone.`);
  }

  collectedCount++;
  updateHUD();
}

function installPlantingUI() {
  const style = document.createElement('style');

  style.textContent = `
    #plant-tree-button {
      position: fixed;
      right: 26px;
      bottom: 28px;
      z-index: 20;
      border: 1px solid rgba(190,225,155,.55);
      border-radius: 14px;
      padding: 13px 17px;
      color: #f4ffe9;
      background: rgba(22,52,32,.9);
      font: 700 13px/1.2 system-ui,sans-serif;
      cursor: pointer;
      box-shadow: 0 8px 28px rgba(0,0,0,.25);
      backdrop-filter: blur(12px);
    }

    #plant-tree-button:hover {
      background: rgba(42,91,49,.98);
    }

    #eco-resource-panel {
      position: fixed;
      right: 26px;
      bottom: 84px;
      z-index: 19;
      padding: 10px 13px;
      border-radius: 10px;
      color: #f1f7e9;
      background: rgba(14,28,20,.78);
      font: 12px system-ui,sans-serif;
      border: 1px solid rgba(255,255,255,.12);
      backdrop-filter: blur(8px);
    }

    @media (max-width: 600px) {
      #plant-tree-button {
        right: 12px;
        bottom: 14px;
      }

      #eco-resource-panel {
        right: 12px;
        bottom: 70px;
      }
    }
  `;

  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'eco-resource-panel';
  panel.innerHTML =
    '🌱 Seeds: <b id="seed-count">10</b> &nbsp; · &nbsp; ' +
    '🌳 Planted: <b id="planted-count">0</b>';

  document.body.appendChild(panel);

  const button = document.createElement('button');
  button.id = 'plant-tree-button';
  button.type = 'button';
  button.textContent = '🌱 PLANT TREE';

  button.addEventListener('click', () => {
    if (!gameStarted) {
      showToast('Start the expedition first.');
      return;
    }

    if (paused) {
      showToast('Resume the game before planting.');
      return;
    }

    if (treeSeeds <= 0) {
      showToast('No seeds left.');
      return;
    }

    // The camera is behind the player. Its horizontal offset
    // approximates the direction the character is facing.
    const dx = camera.position.x - player.position.x;
    const dz = camera.position.z - player.position.z;
    const yaw = Math.atan2(dx, dz);

    const distance = 3;
    const x = player.position.x - Math.sin(yaw) * distance;
    const z = player.position.z - Math.cos(yaw) * distance;

    if (!world.plantTree(x, z)) {
      showToast('Move to an open area to plant a tree.');
      return;
    }

    treeSeeds--;
    updateHUD();
    showToast('Sapling planted! Watch it grow. 🌱');
  });

  document.body.appendChild(button);
}

installPlantingUI();

$('#start-button').addEventListener('click', () => {
  gameStarted = true;
  startOverlay.classList.add('hidden');
  canvas.focus();
  showToast('Expedition started. Explore the forest.');
});

function togglePause(force?: boolean) {
  if (!gameStarted) return;

  paused = force ?? !paused;
  pauseOverlay.classList.toggle('hidden', !paused);

  if (paused && document.pointerLockElement) {
    document.exitPointerLock();
  }
}

$('#pause-button').addEventListener('click', () => togglePause());
$('#resume-button').addEventListener('click', () => togglePause(false));

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && gameStarted) {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    } else {
      togglePause();
    }
  }
});

function animate(now: number) {
  requestAnimationFrame(animate);

  const delta = Math.min(
    (now - (lastTime || now)) / 1000,
    0.04
  );

  lastTime = now;

  if (gameStarted && !paused) {
    player.update(delta);
    world.updatePlantedTrees(delta);

    survivalTick += delta;

    if (survivalTick > 8) {
      survivalTick = 0;

      hunger = Math.max(0, hunger - 0.7);
      thirst = Math.max(0, thirst - 1.1);

      if (hunger <= 0 || thirst <= 0) {
        health = Math.max(0, health - 1);
      }

      if (health <= 0) {
        showToast('You are exhausted. Find supplies to survive.');
      }
    }

    interactionTarget = findNearbyResource();

    if (interactionTarget) {
      interactionHint.classList.remove('hidden');

      interactionText.textContent =
        interactionTarget.kind === 'wood'
          ? 'Gather fallen wood'
          : 'Collect stone';
    } else {
      interactionHint.classList.add('hidden');
    }

    const eNow = player.isInteracting;

    if (eNow && !previousE && interactionTarget) {
      collectResource(interactionTarget);
    }

    previousE = eNow;
    updateHUD();
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.7)
  );
});

updateHUD();
