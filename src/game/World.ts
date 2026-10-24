
import * as THREE from 'three';

export type ResourceNode = {
  mesh: THREE.Group;
  kind: 'wood' | 'stone';
  amount: number;
  collected: boolean;
};

type GrowingTree = {
  group: THREE.Group;
  elapsed: number;
  duration: number;
};

export class World {
  public resources: ResourceNode[] = [];
  public plantedTreeCount = 0;

  private scene: THREE.Scene;
  private size = 360;
  private treePositions: THREE.Vector2[] = [];
  private plantedTrees: GrowingTree[] = [];

  private trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x654329,
    roughness: 1
  });

  private leafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x234b2b, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x376534, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x527b3e, roughness: 1 })
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createLighting();
    this.createGround();
    this.createForest();
    this.createBushes();
    this.createRocks();
    this.createResources();
  }

  public getGroundHeight(x: number, z: number): number {
    return (
      Math.sin(x * 0.035) * 1.4 +
      Math.cos(z * 0.028) * 1.1 +
      Math.sin((x + z) * 0.018) * 1.5
    );
  }

  private createLighting() {
    this.scene.add(
      new THREE.HemisphereLight(0xdcebd8, 0x35432b, 2)
    );

    const sun = new THREE.DirectionalLight(0xffedcf, 3);
    sun.position.set(-55, 85, 35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);

    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 250;
    sun.shadow.bias = -0.00025;

    this.scene.add(sun);
  }

  private createGround() {
    const geometry = new THREE.PlaneGeometry(
      this.size,
      this.size,
      150,
      150
    );

    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      positions.setY(i, this.getGroundHeight(x, z));
    }

    geometry.computeVertexNormals();

    const ground = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x526b3b,
        roughness: 1
      })
    );

    ground.receiveShadow = true;
    this.scene.add(ground);

    const patchMaterials = [
      new THREE.MeshStandardMaterial({
        color: 0x71844b,
        transparent: true,
        opacity: 0.35,
        roughness: 1
      }),
      new THREE.MeshStandardMaterial({
        color: 0x3c552d,
        transparent: true,
        opacity: 0.3,
        roughness: 1
      })
    ];

    for (let i = 0; i < 180; i++) {
      const x = (Math.random() - 0.5) * (this.size - 8);
      const z = (Math.random() - 0.5) * (this.size - 8);

      const patch = new THREE.Mesh(
        new THREE.CircleGeometry(1, 10),
        patchMaterials[i % patchMaterials.length]
      );

      patch.rotation.x = -Math.PI / 2;
      patch.rotation.z = Math.random() * Math.PI;

      patch.scale.set(
        2 + Math.random() * 5,
        2 + Math.random() * 5,
        1
      );

      patch.position.set(
        x,
        this.getGroundHeight(x, z) + 0.03,
        z
      );

      this.scene.add(patch);
    }
  }

  private createTree(
    x: number,
    z: number,
    scale = 1,
    remember = true
  ): THREE.Group {
    const tree = new THREE.Group();
    const groundY = this.getGroundHeight(x, z);

    tree.position.set(x, groundY, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(scale);

    const trunkHeight = 3.2 + Math.random() * 1.5;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.2,
        0.36,
        trunkHeight,
        8
      ),
      this.trunkMaterial
    );

    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const crownCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < crownCount; i++) {
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(
          1.4 + Math.random() * 1.1,
          2.3 + Math.random() * 1.5,
          8,
          2
        ),
        this.leafMaterials[
          Math.floor(Math.random() * this.leafMaterials.length)
        ]
      );

      crown.position.set(
        (Math.random() - 0.5) * 0.9,
        trunkHeight * 0.65 + i * 0.45,
        (Math.random() - 0.5) * 0.9
      );

      crown.rotation.y = Math.random() * Math.PI;
      crown.castShadow = true;
      crown.receiveShadow = true;
      tree.add(crown);
    }

    this.scene.add(tree);

    if (remember) {
      this.treePositions.push(new THREE.Vector2(x, z));
    }

    return tree;
  }

  private createForest() {
    let placed = 0;
    let attempts = 0;

    while (placed < 560 && attempts < 4000) {
      attempts++;

      const x = (Math.random() - 0.5) * (this.size - 18);
      const z = (Math.random() - 0.5) * (this.size - 18);

      // Keep the starting area open.
      if (Math.hypot(x, z) < 12) continue;

      this.createTree(
        x,
        z,
        0.65 + Math.random() * 0.85
      );

      placed++;
    }
  }

  private createBushes() {
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0x35572b, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x496c35, roughness: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x5c733b, roughness: 1 })
    ];

    for (let i = 0; i < 250; i++) {
      const x = (Math.random() - 0.5) * (this.size - 10);
      const z = (Math.random() - 0.5) * (this.size - 10);

      if (Math.hypot(x, z) < 5) continue;

      const bush = new THREE.Group();
      bush.position.set(x, this.getGroundHeight(x, z), z);

      const count = 3 + Math.floor(Math.random() * 4);

      for (let j = 0; j < count; j++) {
        const blob = new THREE.Mesh(
          new THREE.IcosahedronGeometry(
            0.45 + Math.random() * 0.45,
            1
          ),
          materials[Math.floor(Math.random() * materials.length)]
        );

        blob.position.set(
          (Math.random() - 0.5) * 1.2,
          0.35 + Math.random() * 0.45,
          (Math.random() - 0.5) * 1.2
        );

        blob.scale.y = 0.7;
        blob.castShadow = true;
        bush.add(blob);
      }

      this.scene.add(bush);
    }
  }

  private createRocks() {
    const material = new THREE.MeshStandardMaterial({
      color: 0x686c62,
      roughness: 0.95
    });

    for (let i = 0; i < 90; i++) {
      const x = (Math.random() - 0.5) * (this.size - 12);
      const z = (Math.random() - 0.5) * (this.size - 12);

      if (Math.hypot(x, z) < 8) continue;

      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(
          0.45 + Math.random() * 0.8,
          0
        ),
        material
      );

      rock.position.set(
        x,
        this.getGroundHeight(x, z) + 0.35,
        z
      );

      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.scale.set(1.2, 0.8, 0.9);
      rock.castShadow = true;
      rock.receiveShadow = true;

      this.scene.add(rock);
    }
  }

  private createResources() {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x69442b,
      roughness: 1
    });

    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x77796e,
      roughness: 1
    });

    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * (this.size - 24);
      const z = (Math.random() - 0.5) * (this.size - 24);

      if (Math.hypot(x, z) < 7) continue;

      const group = new THREE.Group();
      group.position.set(
        x,
        this.getGroundHeight(x, z) + 0.25,
        z
      );

      group.rotation.y = Math.random() * Math.PI;

      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.25, 2.5, 8),
        woodMaterial
      );

      log.rotation.z = Math.PI / 2;
      log.castShadow = true;
      group.add(log);

      this.scene.add(group);

      this.resources.push({
        mesh: group,
        kind: 'wood',
        amount: 2,
        collected: false
      });
    }

    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * (this.size - 24);
      const z = (Math.random() - 0.5) * (this.size - 24);

      if (Math.hypot(x, z) < 7) continue;

      const group = new THREE.Group();
      group.position.set(x, this.getGroundHeight(x, z), z);

      for (let j = 0; j < 4; j++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(
            0.3 + Math.random() * 0.3,
            0
          ),
          stoneMaterial
        );

        rock.position.set(
          (Math.random() - 0.5) * 0.8,
          0.25 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.8
        );

        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        group.add(rock);
      }

      this.scene.add(group);

      this.resources.push({
        mesh: group,
        kind: 'stone',
        amount: 2,
        collected: false
      });
    }
  }

  public plantTree(x: number, z: number): boolean {
    if (
      Math.abs(x) > this.size / 2 - 5 ||
      Math.abs(z) > this.size / 2 - 5
    ) {
      return false;
    }

    const position = new THREE.Vector2(x, z);

    for (const existing of this.treePositions) {
      if (existing.distanceTo(position) < 3.2) {
        return false;
      }
    }

    for (const resource of this.resources) {
      if (resource.collected) continue;

      const dx = resource.mesh.position.x - x;
      const dz = resource.mesh.position.z - z;

      if (Math.hypot(dx, dz) < 2.3) {
        return false;
      }
    }

    const sapling = new THREE.Group();
    sapling.position.set(x, this.getGroundHeight(x, z), z);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.5, 0.12, 9),
      new THREE.MeshStandardMaterial({ color: 0x483622, roughness: 1 })
    );

    soil.position.y = 0.06;
    sapling.add(soil);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.085, 1.15, 7),
      this.trunkMaterial
    );

    stem.position.y = 0.62;
    stem.castShadow = true;
    sapling.add(stem);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.3, 7, 2),
      this.leafMaterials[1]
    );

    leaves.position.y = 1.45;
    leaves.castShadow = true;
    sapling.add(leaves);

    const topLeaves = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.95, 7, 2),
      this.leafMaterials[2]
    );

    topLeaves.position.y = 2;
    topLeaves.castShadow = true;
    sapling.add(topLeaves);

    sapling.scale.setScalar(0.35);
    this.scene.add(sapling);

    this.treePositions.push(position);
    this.plantedTrees.push({
      group: sapling,
      elapsed: 0,
      duration: 18
    });

    this.plantedTreeCount++;
    return true;
  }

  public updatePlantedTrees(delta: number) {
    for (const tree of this.plantedTrees) {
      if (tree.elapsed >= tree.duration) continue;

      tree.elapsed = Math.min(
        tree.duration,
        tree.elapsed + delta
      );

      const progress = tree.elapsed / tree.duration;
      const eased = 1 - Math.pow(1 - progress, 2);
      const scale = 0.35 + (1 - 0.35) * eased;

      tree.group.scale.setScalar(scale);
    }
  }
}
