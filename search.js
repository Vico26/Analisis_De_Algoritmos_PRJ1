// /search.js
// BFS y A* + heurística para Traffic Jam (distancia a salida + bloqueadores).

import { isGoal } from './board.js';
import { neighbors as genNeighbors } from './moves.js';

/** Cola simple */
class Queue {
  constructor(){ this.q=[]; this.h=0; }
  push(x){ this.q.push(x); }
  shift(){ return this.q[this.h++]; }
  get length(){ return this.q.length - this.h; }
}

/** Priority Queue mínima (binaria) para A* */
class MinPQ {
  constructor(){ this.a=[]; }
  push(item, pri){ this.a.push({item, pri}); this._up(this.a.length-1); }
  pop(){
    if (this.a.length===0) return null;
    const top=this.a[0]; const last=this.a.pop();
    if (this.a.length){ this.a[0]=last; this._down(0); }
    return top.item;
  }
  _up(i){ while(i>0){ const p=(i-1>>1); if(this.a[p].pri<=this.a[i].pri) break; [this.a[p],this.a[i]]=[this.a[i],this.a[p]]; i=p; } }
  _down(i){ const n=this.a.length; for(;;){ let l=i*2+1, r=l+1, s=i; if(l<n && this.a[l].pri<this.a[s].pri) s=l; if(r<n && this.a[r].pri<this.a[s].pri) s=r; if(s===i) break; [this.a[i],this.a[s]]=[this.a[s],this.a[i]]; i=s; } }
}

/** Reconstruye path a partir de 'parents': { hash -> {prevHash, move, state} } */
export function reconstructPath(parents, startHash, goalHash){
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

/** Heurística admisible: distancia hasta salida + número de bloqueadores delante del objetivo. */
export function heuristic(state){
  const t = state.vehicles.find(v => v.id === state.targetId);
  if (!t) return 0;
  // posición de cabeza del target
  const head = t.orient==='H' ? {x: t.col + t.length - 1, y: t.row} : {x: t.col, y: t.row + t.length - 1};
  const [ex, ey] = state.exit;

  if (t.orient === 'H') {
    if (ey !== t.row || ex < head.x) return 0;
    const dist = ex - head.x;
    // bloqueadores únicos en el camino (celdas entre head+1 .. ex)
    const seen = new Set();
    for (let x=head.x+1; x<=ex; x++){
      const id = state.vehicles.find(v =>
        (v.orient==='H' && v.row===t.row && x>=v.col && x< v.col+v.length) ||
        (v.orient==='V' && x===v.col && t.row>=v.row && t.row< v.row+v.length)
      )?.id;
      if (id && id !== t.id) seen.add(id);
    }
    return dist + seen.size;
  } else {
    if (ex !== t.col || ey < head.y) return 0;
    const dist = ey - head.y;
    const seen = new Set();
    for (let y=head.y+1; y<=ey; y++){
      const id = state.vehicles.find(v =>
        (v.orient==='V' && v.col===t.col && y>=v.row && y< v.row+v.length) ||
        (v.orient==='H' && t.col>=v.col && t.col< v.col+v.length && y===v.row)
      )?.id;
      if (id && id !== t.id) seen.add(id);
    }
    return dist + seen.size;
  }
}

/** BFS con métricas */
export function bfs(problem){
  const { initial, hash } = problem;
  const startHash = hash(initial);
  const q = new Queue();
  q.push(initial);
  const visited = new Set([startHash]);
  const parents = new Map();

  // Métricas
  let statesExplored = 0;
  let startTime = performance.now();

  while(q.length){
    const s = q.shift();
    statesExplored++;

    if (problem.isGoal(s)) {
      const gh = hash(s);
      const endTime = performance.now();
      return { 
        ok: true, 
        ...reconstructPath(parents, startHash, gh), 
        goal: s,
        metrics: {
          time: endTime - startTime,
          statesExplored: statesExplored,
          moves: reconstructPath(parents, startHash, gh).moves.length
        }
      };
    }

    for (const nb of problem.neighbors(s)) {
      const h = hash(nb.state);
      if (visited.has(h)) continue;
      visited.add(h);
      parents.set(h, { prev: hash(s), move: nb.move, state: nb.state });
      q.push(nb.state);
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

/** A* con métricas */
export function astar(problem, h = heuristic){
  const { initial, hash } = problem;
  const startHash = hash(initial);
  const pq = new MinPQ();
  const gScore = new Map([[startHash, 0]]);
  const parents = new Map();
  const visited = new Set();
  
  // Métricas
  let statesExplored = 0;
  let maxOpenList = 0;
  let startTime = performance.now();

  pq.push(initial, h(initial));

  while(pq.a.length > 0){
    // Actualizar máximo de lista abierta
    maxOpenList = Math.max(maxOpenList, pq.a.length);
    
    const current = pq.pop();
    if (!current) break;
    
    const currentHash = hash(current);
    if (visited.has(currentHash)) continue;
    
    visited.add(currentHash);
    statesExplored++;

    if (problem.isGoal(current)) {
      const endTime = performance.now();
      return { 
        ok: true, 
        ...reconstructPath(parents, startHash, currentHash), 
        goal: current, 
        cost: gScore.get(currentHash) ?? 0,
        metrics: {
          time: endTime - startTime,
          statesExplored: statesExplored,
          moves: reconstructPath(parents, startHash, currentHash).moves.length,
          maxOpenList: maxOpenList,
          finalOpenList: pq.a.length,
          closedList: visited.size
        }
      };
    }

    const currentG = gScore.get(currentHash) ?? 0;
    
    for (const neighbor of problem.neighbors(current)) {
      const neighborState = neighbor.state;
      const neighborHash = hash(neighborState);
      
      if (visited.has(neighborHash)) continue;
      
      const tentativeG = currentG + (neighbor.cost ?? 1);
      const existingG = gScore.get(neighborHash);
      
      if (existingG === undefined || tentativeG < existingG) {
        gScore.set(neighborHash, tentativeG);
        parents.set(neighborHash, { 
          prev: currentHash, 
          move: neighbor.move, 
          state: neighborState 
        });
        
        const fScore = tentativeG + h(neighborState);
        pq.push(neighborState, fScore);
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
      moves: 0,
      maxOpenList: maxOpenList,
      finalOpenList: pq.a.length,
      closedList: visited.size
    }
  };
}

/** Construye un "problem" a partir de funciones */
export function makeProblem({ initial, isGoal, neighbors, hash }){
  return { initial, isGoal, neighbors, hash };
}

// Export conveniente
export default { bfs, astar, heuristic, makeProblem, reconstructPath };