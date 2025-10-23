// /board.js
// Todo lo del tablero

export const MAX_ROWS = 12;
export const MAX_COLS = 12;

export const SYMBOL = Object.freeze({
  EMPTY: '.',
  H_BODY: '-',
  V_BODY: '|',
  RIGHT_HEAD: '>',
  DOWN_HEAD: 'v',
  TARGET_HEAD: 'B',
});

/** Estado del juego. exit = [x,y] en 0-index internamente */
export class State {
  constructor(rows, cols, exit, vehicles, targetId) {
    this.rows = rows;
    this.cols = cols;
    this.exit = exit;           // [x,y] (0-index)
    this.vehicles = vehicles;   // Array<VehicleLike>
    this.targetId = targetId;   // id del vehículo objetivo
  }
}

/** bota si se pasa de 12×12, límites, solapes o salida inválida */
export function validateState(s) {
  if (!Number.isInteger(s.rows) || !Number.isInteger(s.cols)) throw new Error('Tamaño inválido.');
  if (s.rows < 1 || s.cols < 1) throw new Error('El tablero debe tener al menos 1×1.');
  if (s.rows > MAX_ROWS || s.cols > MAX_COLS) throw new Error(`El tamaño máximo es ${MAX_ROWS}×${MAX_COLS}.`);
  if (!Array.isArray(s.vehicles) || s.vehicles.length === 0) throw new Error('No hay vehículos.');
  if (!Array.isArray(s.exit) || s.exit.length !== 2) throw new Error('Salida (x,y) requerida.');
  const [ex, ey] = s.exit;
  if (ex < 0 || ey < 0 || ex >= s.cols || ey >= s.rows) throw new Error(`Salida fuera del tablero (x=${ex+1}, y=${ey+1}).`);
  for (const v of s.vehicles) {
    if (v.length < 2) throw new Error(`Vehículo ${v.id}: longitud mínima 2.`);
    if (v.orient !== 'H' && v.orient !== 'V') throw new Error(`Vehículo ${v.id}: orientación inválida.`);
    if (v.orient === 'H') {
      if (v.row < 0 || v.row >= s.rows) throw new Error(`Vehículo ${v.id}: fila ${v.row+1} fuera.`);
      if (v.col < 0 || v.col + v.length - 1 >= s.cols) throw new Error(`Vehículo ${v.id}: sale por columnas (x=${v.col+1}..${v.col+v.length}).`);
    } else {
      if (v.col < 0 || v.col >= s.cols) throw new Error(`Vehículo ${v.id}: columna ${v.col+1} fuera.`);
      if (v.row < 0 || v.row + v.length - 1 >= s.rows) throw new Error(`Vehículo ${v.id}: sale por filas (y=${v.row+1}..${v.row+v.length}).`);
    }
  }
  // Solapes (bota si los hay)
  occupancy(s);
  return true;
}

/** Matriz de ocupación: id o -1; bota en caso de solape */
export function occupancy(s) {
  const g = Array.from({ length: s.rows }, () => Array(s.cols).fill(-1));
  for (const v of s.vehicles) {
    if (v.orient === 'H') {
      for (let j = 0; j < v.length; j++) {
        const x = v.col + j, y = v.row;
        if (g[y][x] !== -1) throw new Error(`Solape de vehículos en (x=${x+1}, y=${y+1}).`);
        g[y][x] = v.id;
      }
    } else {
      for (let i = 0; i < v.length; i++) {
        const x = v.col, y = v.row + i;
        if (g[y][x] !== -1) throw new Error(`Solape de vehículos en (x=${x+1}, y=${y+1}).`);
        g[y][x] = v.id;
      }
    }
  }
  return g;
}

/** ¿Se logro? Frente del objetivo coincide con la salida */
export function isGoal(s) {
  const t = s.vehicles.find(v => v.id === s.targetId);
  if (!t) return false;
  const head = t.orient === 'H'
    ? [t.col + t.length - 1, t.row]  // [x,y]
    : [t.col, t.row + t.length - 1];
  const [ex, ey] = s.exit;
  return head[0] === ex && head[1] === ey;
}

/** Hash estable por posiciones (para visited/algoritmos) */
export function hashState(s) {
  return s.vehicles
    .slice()
    .sort((a,b) => a.id - b.id)
    .map(v => `${v.id}:${v.row},${v.col}`)
    .join('|');
}
