// /moves.js
// Descripción de movimientos (en español), mostrando coordenadas finales en 1-index.

export const DIR = Object.freeze({
  LEFT: 'LEFT', RIGHT: 'RIGHT', UP: 'UP', DOWN: 'DOWN',
});

function vehicleKind(v){ return (v.length >= 3) ? 'bus' : 'carro'; }
function baseCoord(v){ return v.orient === 'H' ? v.col : v.row; }

/**
 * describeMove:
 * - move: { vehicleId, dir?, steps?, delta? }
 * - stateBefore: estado previo
 * - stateAfter?: estado posterior (preferido para pos final exacta)
 * Retorna: "carro 3 a la izquierda (2) → pos final: (x,y)"  **(x,y en 1-index)**
 */
export function describeMove(move, stateBefore, stateAfter){
  const v0 = stateBefore.vehicles.find(x => x.id === move.vehicleId);
  if (!v0) throw new Error(`Vehículo ${move.vehicleId} no existe`);
  const kind = vehicleKind(v0);
  const steps = Math.abs(move.steps ?? move.delta ?? 1);

  // Dirección
  let dir = move.dir;
  if (!dir) {
    const d = move.delta ?? move.steps ?? 0;
    dir = (v0.orient === 'H') ? (d < 0 ? DIR.LEFT : DIR.RIGHT)
                              : (d < 0 ? DIR.UP   : DIR.DOWN);
  }
  const dirEs = ({ LEFT:'a la izquierda', RIGHT:'a la derecha', UP:'arriba', DOWN:'abajo' })[dir];

  // Posición final (x,y) mostrada en 1-index
  let xf, yf;
  if (stateAfter) {
    const v1 = stateAfter.vehicles.find(x => x.id === v0.id);
    if (!v1) throw new Error(`Estado después no contiene el vehículo ${v0.id}`);
    xf = v1.col + 1; yf = v1.row + 1;    // ← 1-index
  } else {
    if (v0.orient === 'H') {
      const sign = (dir === DIR.LEFT ? -1 : +1);
      xf = (v0.col + sign * steps) + 1; yf = v0.row + 1;
    } else {
      const sign = (dir === DIR.UP ? -1 : +1);
      xf = v0.col + 1; yf = (v0.row + sign * steps) + 1;
    }
  }

  return `${kind} ${v0.id} ${dirEs} (${steps}) → pos final: (${xf},${yf})`;
}

/** Infere el movimiento comparando dos estados consecutivos. */
export function inferMove(prevState, nextState){
  const byIdPrev = new Map(prevState.vehicles.map(v => [v.id, v]));
  const byIdNext = new Map(nextState.vehicles.map(v => [v.id, v]));

  let changed = null;
  for (const [id, v0] of byIdPrev) {
    const v1 = byIdNext.get(id);
    if (!v1) continue;
    const b0 = baseCoord(v0), b1 = baseCoord(v1);
    if (b0 !== b1) { changed = { v0, v1, delta: b1 - b0 }; break; }
  }
  if (!changed) throw new Error('No se detectó cambio entre estados');

  const { v0, v1, delta } = changed;
  const steps = Math.abs(delta);
  const dir = (v0.orient === 'H') ? (delta < 0 ? DIR.LEFT : DIR.RIGHT)
                                  : (delta < 0 ? DIR.UP   : DIR.DOWN);
  const text = describeMove({ vehicleId: v0.id, dir, steps }, prevState, nextState);
  return { vehicleId: v0.id, dir, steps, final: [v1.col + 1, v1.row + 1], text }; // final en 1-index
}

/** Genera descripciones para un path de estados [s0..sk]. */
export function describePath(states){
  if (!states || states.length < 2) return [];
  const out = [];
  for (let i = 1; i < states.length; i++) {
    const step = inferMove(states[i-1], states[i]);
    out.push(step.text);
  }
  return out;
}
