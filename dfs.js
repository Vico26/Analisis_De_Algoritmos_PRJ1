// /dfs.js
// DFS puro (Depth-First Search) sin heurística

export function dfs(problem, opts = {}) {
  const { initial, isGoal, neighbors, hash } = problem;
  const { maxDepth = 1000, timeLimitMs = 1000000 } = opts;

  const startHash = hash(initial);
  const visited = new Set([startHash]);
  const parents = new Map();
  const stack = [{ state: initial, depth: 0 }];
  
  // Métricas
  let statesExplored = 0;
  let startTime = performance.now();

  while (stack.length > 0) {
    // Verificar tiempo límite
    if (performance.now() - startTime > timeLimitMs) {
      break;
    }

    const { state, depth } = stack.pop();
    statesExplored++;

    // Verificar si es goal
    if (isGoal(state)) {
      const goalHash = hash(state);
      const endTime = performance.now();
      return {
        ok: true,
        ...reconstructPath(parents, startHash, goalHash),
        goal: state,
        metrics: {
          time: endTime - startTime,
          statesExplored: statesExplored,
          moves: reconstructPath(parents, startHash, goalHash).moves.length
        }
      };
    }

    // Verificar profundidad máxima
    if (depth >= maxDepth) {
      continue;
    }

    // Obtener vecinos y agregarlos a la pila (en orden inverso para mantener el orden natural)
    const neighborsList = neighbors(state);
    for (let i = neighborsList.length - 1; i >= 0; i--) {
      const nb = neighborsList[i];
      const nbHash = hash(nb.state);

      if (!visited.has(nbHash)) {
        visited.add(nbHash);
        parents.set(nbHash, { 
          prev: hash(state), 
          move: nb.move, 
          state: nb.state 
        });
        stack.push({ state: nb.state, depth: depth + 1 });
      }
    }
  }

  const endTime = performance.now();
  return {
    ok: false,
    states: [],
    moves: [],
    goal: null,
    metrics: {
      time: endTime - startTime,
      statesExplored: statesExplored,
      moves: 0
    }
  };
}

function reconstructPath(parents, startHash, goalHash) {
  const states = [], moves = [];
  let cur = goalHash;
  while (cur !== startHash) {
    const rec = parents.get(cur);
    if (!rec) break;
    states.push(rec.state);
    moves.push(rec.move);
    cur = rec.prev;
  }
  states.reverse();
  moves.reverse();
  return { states, moves };
}

export default { dfs };