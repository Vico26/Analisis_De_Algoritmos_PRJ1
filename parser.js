// /parser.js
// Parser del tablero en texto (espacios entre casillas). Salida (x,y) en 1-index → se convierte a 0-index.

import { SYMBOL } from './board.js';
import { Car, Bus } from './vehicles.js';

/** Lee "(x,y)" o "x,y" como 1-index y retorna [x-1, y-1] */
export function parseExit(str) {
  if (typeof str !== 'string') throw new Error('Salida inválida.');
  const m = str.match(/(-?\d+)\s*,\s*(-?\d+)/);
  if (!m) throw new Error('Salida inválida. Usa "(x,y)" o "x,y" (1-index).');
  const x = parseInt(m[1], 10);
  const y = parseInt(m[2], 10);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Salida inválida.');
  return [x - 1, y - 1]; // 1-index → 0-index
}

/**
 * Parsea el grid con símbolos:
 * '.' vacío, '-' cuerpo H, '>' cabeza H derecha, '|' cuerpo V, 'v' cabeza V abajo, 'B' cabeza objetivo.
 * Devuelve { rows, cols, vehicles, targetId }.
 */
export function parseGrid(text) {
  if (typeof text !== 'string') throw new Error('Entrada inválida.');
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 0) throw new Error('Tablero vacío.');
  const grid = rawLines.map(row => row.split(/\s+/));
  const rows = grid.length;
  const cols = grid[0].length;
  if (!grid.every(r => r.length === cols)) throw new Error('Filas con distinto número de columnas.');

  const used = Array.from({ length: rows }, () => Array(cols).fill(false));
  const vehicles = [];
  let targetId = -1;
  let nextId = 1;

  const isHChar = tok => tok === SYMBOL.H_BODY || tok === SYMBOL.RIGHT_HEAD || tok === SYMBOL.TARGET_HEAD;
  const isVChar = tok => tok === SYMBOL.V_BODY || tok === SYMBOL.DOWN_HEAD || tok === SYMBOL.TARGET_HEAD;

  // Detectar horizontales
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (used[r][c]) continue;
      const tok = grid[r][c];
      if (!isHChar(tok)) continue;

      // Avanzar mientras sea parte H
      let cc = c, len = 0, headAt = -1;
      while (cc < cols && isHChar(grid[r][cc])) {
        if (grid[r][cc] === SYMBOL.RIGHT_HEAD || grid[r][cc] === SYMBOL.TARGET_HEAD) headAt = cc;
        cc++; len++;
      }
      if (headAt === -1) continue; // no hay cabeza → no es vehículo horizontal válido

      // El head debe ser el extremo derecho del segmento
      const startCol = headAt - (len - 1);
      if (startCol < 0) throw new Error(`Corrida horizontal inválida en fila ${r+1}.`);

      // Marcar usadas
      for (let j = 0; j < len; j++) used[r][startCol + j] = true;

      // Construir vehículo (según largo)
      const id = nextId++;
      const orient = 'H';
      const length = len;
      const row = r;
      const col = startCol;
      const veh = (length >= 3) ? new Bus(id, orient, row, col, length) : new Car(id, orient, row, col, length);
      vehicles.push(veh);
      if (grid[r][headAt] === SYMBOL.TARGET_HEAD) targetId = id;

      // Saltar hasta cc-1
      c = cc - 1;
    }
  }

  // Detectar verticales
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (used[r][c]) continue;
      const tok = grid[r][c];
      if (!isVChar(tok)) continue;

      // Avanzar mientras sea parte V
      let rr = r, len = 0, headAt = -1;
      while (rr < rows && isVChar(grid[rr][c])) {
        if (grid[rr][c] === SYMBOL.DOWN_HEAD || grid[rr][c] === SYMBOL.TARGET_HEAD) headAt = rr;
        rr++; len++;
      }
      if (headAt === -1) continue; // no hay cabeza → no es vehículo vertical válido

      // El head debe ser el extremo inferior del segmento
      const startRow = headAt - (len - 1);
      if (startRow < 0) throw new Error(`Corrida vertical inválida en columna ${c+1}.`);

      // Marcar usadas
      for (let i = 0; i < len; i++) used[startRow + i][c] = true;

      // Construir vehículo
      const id = nextId++;
      const orient = 'V';
      const length = len;
      const row = startRow;
      const col = c;
      const veh = (length >= 3) ? new Bus(id, orient, row, col, length) : new Car(id, orient, row, col, length);
      vehicles.push(veh);
      if (grid[headAt][c] === SYMBOL.TARGET_HEAD) targetId = id;

      // Saltar hasta rr-1
      r = rr - 1;
    }
  }

  if (vehicles.length === 0) throw new Error('No se detectaron vehículos.');
  if (targetId === -1) throw new Error('No se detectó el vehículo objetivo (B).');

  return { rows, cols, vehicles, targetId };
}
