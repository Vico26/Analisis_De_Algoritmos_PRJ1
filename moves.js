// /moves.js
// Motor de movimientos (unitarios), vecinos y helpers.

import { occupancy, State } from './board.js';

export function cloneState(s) {
  return new State(
    s.rows, s.cols, [s.exit[0], s.exit[1]],
    s.vehicles.map(v => ({ ...v })), // VehicleLike plano
    s.targetId
  );
}

/** Devuelve [minBase, maxBase](intv) para la base del vehículo (col si H, row si V). */
export function rangeForVehicle(state, vehicle) {
  const g = occupancy(state);
  const { orient, row, col, length } = vehicle;

  let minBase = orient === 'H' ? col : row;
  let maxBase = minBase;

  if (orient === 'H') {
    // izquierda
    for (let c = col - 1; c >= 0; c--) {
      if (g[row][c] === -1) minBase = c; else break;
    }
    // derecha
    for (let c = col + length; c < state.cols; c++) {
      if (g[row][c] === -1) maxBase = c - (length - 1); else break;
    }
  } else {
    // arriba
    for (let r = row - 1; r >= 0; r--) {
      if (g[r][col] === -1) minBase = r; else break;
    }
    // abajo
    for (let r = row + length; r < state.rows; r++) {
      if (g[r][col] === -1) maxBase = r - (length - 1); else break;
    }
  }
  return [minBase, maxBase];
}

/** Genera movimientos unitarios (delta = ±1) para cada vehículo. */
export function generateMoves(state) {
  const moves = [];
  for (const v of state.vehicles) {
    const base = v.orient === 'H' ? v.col : v.row;
    const [minB, maxB] = rangeForVehicle(state, v);

    // hacia abajo/derecha (+1)
    for (let b = base + 1; b <= maxB; b++) {
      moves.push({ vehicleId: v.id, delta: +1 });
      break; // unitario
    }
    // hacia arriba/izquierda (-1)
    for (let b = base - 1; b >= minB; b--) {
      moves.push({ vehicleId: v.id, delta: -1 });
      break; // unitario
    }
  }
  return moves;
}

/** Aplica un movimiento unitario y retorna un NUEVO estado. */
export function applyMove(state, move) {
  const s2 = cloneState(state);
  const v = s2.vehicles.find(x => x.id === move.vehicleId);
  const d = Math.sign(move.delta || 0);
  if (!v || d === 0) return s2;
  if (v.orient === 'H') v.col += d; else v.row += d;
  return s2;
}

/** Vecinos del estado: lista de { state, move, cost:1 } */
export function neighbors(state) {
  const out = [];
  const moves = generateMoves(state);
  for (const mv of moves) {
    const ns = applyMove(state, mv);
    out.push({ state: ns, move: mv, cost: 1 });
  }
  return out;
}
