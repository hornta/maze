import "./index.css";
import { useLayoutEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import * as THREE from "three";
import floorTexture from "./floor.png";
import wallTexture from "./wall.png";
import ceilingTexture from "./ceiling.png";
import smileyTexture from "./smiley.png";
import { Node, makeGraph } from "./maze2.ts";
// import { OrbitControls } from "three/examples/jsm/Addons.js";

const textureLoader = new THREE.TextureLoader();

const MOVE_SPEED = 1.6;
const ROTATE_SPEED = Math.PI * 0.9;
const PRIORITIZED_TURN_ANGLES = [90, 0, -90, 180];
const WALL_SCALE_SPEED = 0.5;

const W = 40;
const H = 40;

function fix(u: THREE.Vector3, v: THREE.Vector3) {
  const denominator = Math.sqrt(u.lengthSq() * v.lengthSq());

  if (denominator === 0) return Math.PI / 2;

  const theta = u.dot(v) / denominator;
  const cross = new THREE.Vector3().crossVectors(u, v);

  const angle = Math.acos(THREE.MathUtils.clamp(theta, -1, 1));
  return cross.y < 0 ? angle * -1 : angle;
}

const Maze = () => {
  const [maze2, setMaze] = useState(makeGraph(W, H));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      90,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    camera.position.x = maze2.startNode.x + 0.5;
    camera.position.z = maze2.startNode.y + 0.5;
    camera.position.y += 0.5;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
    });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);
    onResize();

    // const axesHelper = new THREE.AxesHelper(Number.MAX_SAFE_INTEGER);
    // scene.add(axesHelper);
    const MAX_ANISOTROPY = renderer.capabilities.getMaxAnisotropy();

    function buildWall() {
      // WALLS
      const geometry = new THREE.BufferGeometry();
      const vertices: number[] = [];
      const indices: number[] = [];
      const uvs: number[] = [];

      const makeTrianglesAndSetUvs = () => {
        const firstVertex = vertices.length / 3;
        indices.push(firstVertex, firstVertex + 3, firstVertex + 2);
        indices.push(firstVertex + 2, firstVertex + 1, firstVertex);
        uvs.push(0, 1);
        uvs.push(1, 1);
        uvs.push(1, 0);
        uvs.push(0, 0);
      };

      const neighbors = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0],
      ];
      for (const node of maze2.nodes) {
        for (let i = 0; i < neighbors.length; ++i) {
          const [x, y] = neighbors[i];
          const neighborKey = maze2.makeNodeKey(node.x + x, node.y + y);
          if (!node.edges.includes(neighborKey)) {
            makeTrianglesAndSetUvs();
            if (i === 0) {
              vertices.push(node.x + 1, 1, node.y + 1);
              vertices.push(node.x, 1, node.y + 1);
              vertices.push(node.x, 0, node.y + 1);
              vertices.push(node.x + 1, 0, node.y + 1);
            } else if (i === 1) {
              vertices.push(node.x + 1, 1, node.y);
              vertices.push(node.x + 1, 1, node.y + 1);
              vertices.push(node.x + 1, 0, node.y + 1);
              vertices.push(node.x + 1, 0, node.y);
            } else if (i === 2) {
              vertices.push(node.x, 1, node.y);
              vertices.push(node.x + 1, 1, node.y);
              vertices.push(node.x + 1, 0, node.y);
              vertices.push(node.x, 0, node.y);
            } else if (i === 3) {
              vertices.push(node.x, 1, node.y + 1);
              vertices.push(node.x, 1, node.y);
              vertices.push(node.x, 0, node.y);
              vertices.push(node.x, 0, node.y + 1);
            }
          }
        }
      }

      geometry.setIndex(indices);
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(vertices), 3)
      );
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(new Float32Array(uvs), 2)
      );

      const texture = textureLoader.load(wallTexture);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = MAX_ANISOTROPY;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });
      const walls = new THREE.Mesh(geometry, material);
      // scene.add(walls);

      return walls;
    }

    function buildSmiley() {
      const map = textureLoader.load(smileyTexture);
      const material = new THREE.SpriteMaterial({ map: map });
      material.opacity = 0.6;
      const sprite = new THREE.Sprite(material);
      sprite.position.x = maze2.endNode.x + 0.5;
      sprite.position.z = maze2.endNode.y + 0.5;
      sprite.position.y = 0.5;
      // scene.add(sprite);
      return sprite;
    }

    function buildFloor() {
      // FLOOR
      const geometry = new THREE.PlaneGeometry(W, H);
      const texture = textureLoader.load(floorTexture);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(maze2.width, maze2.height);
      texture.anisotropy = MAX_ANISOTROPY;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotateOnAxis(
        new THREE.Vector3(1, 0, 0),
        THREE.MathUtils.degToRad(-90)
      );
      mesh.position.x = W / 2;
      mesh.position.z = H / 2;
      return mesh;
    }
    function buildCeiling() {
      // CEILING
      const geometry = new THREE.PlaneGeometry(W, H);
      const texture = textureLoader.load(ceilingTexture);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(maze2.width, maze2.height);
      texture.anisotropy = MAX_ANISOTROPY;
      const material = new THREE.MeshBasicMaterial({
        map: texture,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotateOnAxis(
        new THREE.Vector3(1, 0, 0),
        THREE.MathUtils.degToRad(90)
      );
      mesh.position.x = W / 2;
      mesh.position.z = H / 2;
      mesh.position.y = 1;
      return mesh;
    }

    const group = new THREE.Group();
    group.scale.y = 0;
    const walls = buildWall();
    const smiley = buildSmiley();
    const floor = buildFloor();
    const ceiling = buildCeiling();
    scene.add(floor);
    scene.add(ceiling);
    group.add(walls);
    group.add(smiley);
    scene.add(group);

    // const controls = new OrbitControls(camera, canvasEl);

    let previousTime = 0;
    let prevNode = maze2.startNode;

    const nodeToVector3 = (node: Node) => {
      return new THREE.Vector3(node.x + 0.5, 0.5, node.y + 0.5);
    };

    const getPrioritizedNeighbor = (currentNode: Node, prevNode: Node) => {
      const neighbors = currentNode.edges.map(
        (edgeKey) => maze2.nodes[edgeKey]
      );

      const currentNodePos = nodeToVector3(currentNode);
      const direction = currentNodePos
        .clone()
        .sub(nodeToVector3(prevNode))
        .normalize();

      const b = neighbors
        .map((n) => {
          return {
            ...n,
            angle:
              fix(nodeToVector3(n).sub(currentNodePos), direction) *
              THREE.MathUtils.RAD2DEG,
          };
        })
        .sort((a, b) => {
          const indexA = PRIORITIZED_TURN_ANGLES.indexOf(a.angle);
          const indexB = PRIORITIZED_TURN_ANGLES.indexOf(b.angle);
          if (indexA === -1 || indexB === -1) {
            throw new Error();
          }
          return indexA - indexB;
        });

      return b[0]!;
    };

    let targetNode = maze2.nodes[prevNode.edges[0]];
    let rotateTarget = targetNode;
    camera.lookAt(nodeToVector3(targetNode));

    let state = "warmup";

    let rAFHandle: number;
    const animate: FrameRequestCallback = (currentTime) => {
      rAFHandle = requestAnimationFrame(animate);

      const delta = (currentTime - previousTime) / 1000;
      previousTime = currentTime;

      if (delta > 0.1) {
        return;
      }
      // controls.update(delta);

      if (state === "warmup") {
        group.scale.y += WALL_SCALE_SPEED * delta;
        group.scale.y = THREE.MathUtils.clamp(group.scale.y, 0, 1);
        if (group.scale.y === 1) {
          state = "run";
        }
      } else if (state === "teardown") {
        group.scale.y -= WALL_SCALE_SPEED * delta;
        group.scale.y = THREE.MathUtils.clamp(group.scale.y, 0, 1);
        if (group.scale.y === 0) {
          setMaze(makeGraph(W, H));
          state = "warmup";
        }
      } else {
        const targetPos = nodeToVector3(targetNode);
        const rotateTargetPos = nodeToVector3(rotateTarget);
        const distanceFromGoal = Math.sqrt(
          Math.pow(targetPos.x - camera.position.x, 2) +
            Math.pow(targetPos.z - camera.position.z, 2)
        );

        const movementDirection = targetPos
          .clone()
          .sub(camera.position)
          .normalize();

        const velocity = movementDirection.multiplyScalar(MOVE_SPEED * delta);

        if (distanceFromGoal <= velocity.length()) {
          //reached goal, find next waypoint
          const _prevNode = prevNode;
          prevNode = targetNode;
          targetNode = getPrioritizedNeighbor(targetNode, _prevNode)!;
          rotateTarget = getPrioritizedNeighbor(targetNode, prevNode);
        } else {
          // rotate towards target
          const matrix = new THREE.Matrix4();
          matrix.lookAt(camera.position, rotateTargetPos, camera.up);
          const quaternion = new THREE.Quaternion();
          quaternion.setFromRotationMatrix(matrix);
          camera.quaternion.rotateTowards(quaternion, ROTATE_SPEED * delta);
          // const angle =
          //   quaternion.angleTo(camera.quaternion) * THREE.MathUtils.RAD2DEG;
          // move towards target
          // if (Math.abs(angle) < 45) {
          camera.position.add(velocity);
          // }
        }
      }

      renderer.render(scene, camera);
    };
    animate(0);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rAFHandle);
    };
  }, [maze2]);

  return <canvas ref={canvasRef}></canvas>;
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <div className="h-screen bg-yellow-400">
    <Maze />
  </div>
  // </React.StrictMode>
);
