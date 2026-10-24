
import * as THREE from 'three';
import type { World } from './World';

export class Player {
  public currentStamina = 100;
  public isInteracting = false;

  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private world: World;
  private model = new THREE.Group();
  private body: THREE.Mesh;
  private head: THREE.Mesh;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private leftLeg: THREE.Group;
  private rightLeg: THREE.Group;

  private keys: Record<string, boolean> = {};
  private position3 = new THREE.Vector3(0, 0, 0);
  private velocityY = 0;
  private grounded = true;
  private yaw = 0;
  private pitch = -0.16;
  private elapsed = 0;
  private pointerLocked = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    world: World,
  ) {
    this.camera = camera;
    this.canvas = canvas;
    this.world = world;

    const shirt = new THREE.MeshStandardMaterial({
      color: '#304f39', roughness: 0.86,
    });
    const pants = new THREE.MeshStandardMaterial({
      color: '#303a35', roughness: 0.95,
    });
    const skin = new THREE.MeshStandardMaterial({
      color: '#bd8967', roughness: 0.88,
    });
    const bootMaterial = new THREE.MeshStandardMaterial({
      color: '#29261f', roughness: 1,
    });
    const packMaterial = new THREE.MeshStandardMaterial({
      color: '#80613b', roughness: 1,
    });

    this.model.name = 'survivor-character';

    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.31, 0.62, 6, 12),
      shirt,
    );
    this.body.position.y = 1.34;
    this.model.add(this.body);

    const vest = new THREE.Mesh(
      new THREE.BoxGeometry(0.57, 0.42, 0.34),
      new THREE.MeshStandardMaterial({
        color: '#4c6242', roughness: 0.92,
      }),
    );
    vest.position.set(0, 1.42, -0.015);
    this.model.add(vest);

    const backpack = new THREE.Mesh(
      new THREE.BoxGeometry(0.43, 0.57, 0.25),
      packMaterial,
    );
    backpack.position.set(0, 1.42, 0.34);
    this.model.add(backpack);

    const packTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.16, 0.28),
      packMaterial,
    );
    packTop.position.set(0, 1.78, 0.34);
    this.model.add(packTop);

    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 24, 18),
      skin,
    );
    this.head.position.y = 2.04;
    this.model.add(this.head);

    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(
        0.242, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56,
      ),
      new THREE.MeshStandardMaterial({
        color: '#28221c', roughness: 1,
      }),
    );
    hair.position.y = 2.1;
    this.model.add(hair);

    this.leftArm = this.createLimb(0.115, 0.5, shirt);
    this.leftArm.position.set(-0.4, 1.62, 0);
    this.model.add(this.leftArm);

    this.rightArm = this.createLimb(0.115, 0.5, shirt);
    this.rightArm.position.set(0.4, 1.62, 0);
    this.model.add(this.rightArm);

    this.leftLeg = this.createLimb(0.135, 0.55, pants);
    this.leftLeg.position.set(-0.17, 0.81, 0);
    this.model.add(this.leftLeg);

    this.rightLeg = this.createLimb(0.135, 0.55, pants);
    this.rightLeg.position.set(0.17, 0.81, 0);
    this.model.add(this.rightLeg);

    for (const x of [-0.17, 0.17]) {
      const boot = new THREE.Mesh(
        new THREE.BoxGeometry(0.23, 0.14, 0.34),
        bootMaterial,
      );
      boot.position.set(x, 0.11, -0.045);
      this.model.add(boot);
    }

    this.model.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    this.position3.set(0, this.world.getGroundHeight(0, 0), 0);
    this.model.position.copy(this.position3);
    scene.add(this.model);

    this.bindControls();
  }

  private createLimb(
    radius: number,
    length: number,
    material: THREE.Material,
  ): THREE.Group {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, length, 5, 9),
      material,
    );
    mesh.position.y = -length * 0.4;
    pivot.add(mesh);
    return pivot;
  }

  private bindControls(): void {
    window.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();

      if (
        ['w', 'a', 's', 'd', ' ', 'shift', 'e',
          'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
      ) {
        event.preventDefault();
      }

      this.keys[key] = true;

      if (key === ' ' && this.grounded) {
        this.velocityY = 7.5;
        this.grounded = false;
      }
    });

    window.addEventListener('keyup', event => {
      this.keys[event.key.toLowerCase()] = false;
    });

    window.addEventListener('blur', () => {
      this.keys = {};
      this.isInteracting = false;
    });

    this.canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousemove', event => {
      if (!this.pointerLocked) return;

      this.yaw -= event.movementX * 0.0021;
      this.pitch -= event.movementY * 0.0016;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -0.65, 0.24);
    });
  }

  public update(delta: number): void {
    this.elapsed += delta;

    const forward =
      (this.keys.w || this.keys.arrowup ? 1 : 0) -
      (this.keys.s || this.keys.arrowdown ? 1 : 0);

    const side =
      (this.keys.d || this.keys.arrowright ? 1 : 0) -
      (this.keys.a || this.keys.arrowleft ? 1 : 0);

    const moving = forward !== 0 || side !== 0;
    const sprinting = !!this.keys.shift && moving && this.currentStamina > 0;
    const speed = sprinting ? 9 : 4.7;

    if (sprinting) {
      this.currentStamina = Math.max(0, this.currentStamina - delta * 21);
    } else {
      this.currentStamina = Math.min(100, this.currentStamina + delta * 12);
    }

    this.isInteracting = !!this.keys.e;

    if (moving) {
      const direction = new THREE.Vector3(side, 0, -forward).normalize();
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      this.position3.x += direction.x * speed * delta;
      this.position3.z += direction.z * speed * delta;

      const targetYaw = Math.atan2(-direction.x, -direction.z);
      const diff = Math.atan2(
        Math.sin(targetYaw - this.model.rotation.y),
        Math.cos(targetYaw - this.model.rotation.y),
      );
      this.model.rotation.y += diff * (1 - Math.exp(-10 * delta));
    }

    this.position3.x = THREE.MathUtils.clamp(this.position3.x, -174, 174);
    this.position3.z = THREE.MathUtils.clamp(this.position3.z, -174, 174);

    const ground = this.world.getGroundHeight(
      this.position3.x, this.position3.z,
    );

    if (!this.grounded) {
      this.velocityY -= 21 * delta;
      this.position3.y += this.velocityY * delta;

      if (this.position3.y <= ground) {
        this.position3.y = ground;
        this.velocityY = 0;
        this.grounded = true;
      }
    } else {
      this.position3.y = ground;
    }

    const cycle = this.elapsed * (sprinting ? 12 : 7.5);
    const swing = moving ? Math.sin(cycle) * (sprinting ? 0.68 : 0.4) : 0;
    const bob = moving && this.grounded ? Math.abs(Math.sin(cycle)) * 0.04 : 0;

    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;
    this.body.position.y = 1.34 + bob;
    this.head.position.y = 2.04 + bob;

    this.model.position.copy(this.position3);

    const distance = 6.1;
    const target = new THREE.Vector3(
      this.position3.x + Math.sin(this.yaw) * distance,
      this.position3.y + 2.35 + Math.sin(this.pitch) * distance,
      this.position3.z + Math.cos(this.yaw) * distance,
    );

    this.camera.position.lerp(target, 1 - Math.exp(-6.5 * delta));
    this.camera.lookAt(
      this.position3.x,
      this.position3.y + 1.35,
      this.position3.z,
    );
  }

  public get position(): THREE.Vector3 {
    return this.position3;
  }

  public get isMoving(): boolean {
    return !!(
      this.keys.w || this.keys.a || this.keys.s || this.keys.d ||
      this.keys.arrowup || this.keys.arrowdown ||
      this.keys.arrowleft || this.keys.arrowright
    );
  }
}
