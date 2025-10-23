// /backtracking.js
// DFS Backtracking con poda y 'visitados' por hash.

export function backtrack(problem, opts = {}) {
  const { initial, isGoal, neighbors, hash } = problem;
  const { maxDepth = 5000, timeLimitMs = 100000, order = defaultOrder(problem) } = opts;

  const startHash = hash(initial);
  const visited = new Set([startHash]);
  const parents = new Map();
  const t0 = performance.now();
  let goalHash = null;
  let statesExplored = 0;

  function rec(state, depth) {
    statesExplored++;
    if (depth > maxDepth) return false;
    if (performance.now() - t0 > timeLimitMs) return false;
    if (isGoal(state)) { goalHash = hash(state); return true; }

    let list = neighbors(state);
    if (order) list = order(state, list);

    for (const nb of list) {
      const h = hash(nb.state);
      if (visited.has(h)) continue;
      visited.add(h);
      parents.set(h, { prev: hash(state), move: nb.move, state: nb.state });

      if (rec(nb.state, depth + 1)) return true;
    }
    return false;
  }

  const ok = rec(initial, 0);
  const endTime = performance.now();
  
  if (!ok || !goalHash) {
    return { 
      ok: false, 
      states: [], 
      moves: [], 
      goal: null,
      metrics: {
        time: endTime - t0,
        statesExplored: statesExplored,
        moves: 0
      }
    };
  }

  const path = reconstructPath(parents, startHash, goalHash);
  return { 
    ok: true, 
    ...path, 
    goal: path.states.at(-1) || initial,
    metrics: {
      time: endTime - t0,
      statesExplored: statesExplored,
      moves: path.moves.length
    }
  };
}

function reconstructPath(parents, startHash, goalHash){
  const states=[], moves=[];
  let cur=goalHash;
  while(cur!==startHash){
    const rec = parents.get(cur);
    if(!rec) break;
    states.push(rec.state);
    moves.push(rec.move);
    cur = rec.prev;
  }
  states.reverse(); moves.reverse();
  return { states, moves };
}

// Orden simple: prioriza mover el objetivo hacia su salida.
function defaultOrder(problem){
  return (state, list) => {
    const t = state.vehicles.find(v => v.id === state.targetId);
    if (!t) return list;
    const exit = state.exit;
    const signPreferred = t.orient==='H'
      ? (exit[0] > (t.col + t.length - 1) ? +1 : -1)
      : (exit[1] > (t.row + t.length - 1) ? +1 : -1);

    return list.sort((a,b)=>{
      const av = state.vehicles.find(v => v.id===a.move.vehicleId);
      const bv = state.vehicles.find(v => v.id===b.move.vehicleId);
      const aScore = (av?.id===t.id && Math.sign(a.move.delta)===signPreferred) ? -1 : 0;
      const bScore = (bv?.id===t.id && Math.sign(b.move.delta)===signPreferred) ? -1 : 0;
      return aScore - bScore;
    });
  };
}

export default { backtrack };