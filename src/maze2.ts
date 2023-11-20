import { randInt } from "three/src/math/MathUtils.js";

function rand(min: number, max: number) {
  return min + Math.floor(Math.random() * (1 + max - min));
}

export type Node = {
  edges: number[];
  potentialEdges: number[];
  key: number;
  x: number;
  y: number;
};

export const makeGraph = (width: number, height: number) => {
  const makeNodeKey = (x: number, y: number) => {
    return width * y + x;
  };

  const nodes: Node[] = [];

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const key = makeNodeKey(x, y);
      nodes[key] = { edges: [], potentialEdges: [], key: key, x, y };
    }
  }

  const selectedDetailNodes: Node[] = [];
  const startNode = getDetailNode();
  const endNode = getDetailNode();

  const maxDetailNodes = Math.min(1, nodes.length - 2);

  function getDetailNode() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const node = nodes[randInt(0, nodes.length - 1)];
      if (selectedDetailNodes.includes(node)) {
        continue;
      } else {
        selectedDetailNodes.push(node);
        return node;
      }
    }
  }

  const detailNodes: Node[] = [];
  for (let i = 0; i < maxDetailNodes; ++i) {
    detailNodes.push(getDetailNode());
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const nodeKey = makeNodeKey(x, y);
      for (let xi = -1; xi <= 1; xi++) {
        for (let yi = -1; yi <= 1; yi++) {
          // ignore 0,0 and diagonal corners
          if ((xi == 0 && yi == 0) || Math.abs(xi) + Math.abs(yi) != 1) {
            continue;
          }

          const neighborX = x + xi;
          const neighborY = y + yi;

          if (
            neighborX < 0 ||
            neighborX >= width ||
            neighborY < 0 ||
            neighborY >= height
          ) {
            continue;
          }

          const keyEdge = makeNodeKey(neighborX, neighborY);
          if (nodes[keyEdge]) {
            nodes[nodeKey].potentialEdges.push(keyEdge);
          }
        }
      }
    }
  }

  const visitedNodes = new Set<number>();

  function generate(node: Node) {
    visitedNodes.add(node.key);

    const neighbors = node.potentialEdges.slice(0);
    while (neighbors.length > 0) {
      const index = rand(0, neighbors.length - 1);
      const neighborKey = neighbors[index];
      neighbors.splice(index, 1);

      if (!visitedNodes.has(neighborKey)) {
        const neighborNode = nodes[neighborKey];
        node.edges.push(neighborKey);
        neighborNode.edges.push(node.key);
        generate(neighborNode);
      }
    }
  }

  generate(startNode);

  return {
    nodes,
    startNode,
    endNode,
    width,
    height,
    makeNodeKey,
    detailNodes,
  };
};
