// /matrix_viewer.js
// Calles negras; cada vehículo con color único; objetivo B en rojo.
// Cabeza: B para el objetivo, → (H) o ↓ (V) para el resto.

export function renderBlocksWithHeads(text, mount) {
  if (!mount) throw new Error('mount requerido');
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length) { mount.textContent = 'Matriz vacía'; return; }
  const grid = lines.map(row => row.split(/\s+/));
  const rows = grid.length, cols = grid[0].length;

  mount.innerHTML = '';
  const gridEl = document.createElement('div');
  gridEl.className = 'blockgrid';
  gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, var(--cell))`;
  mount.appendChild(gridEl);

  const isH = t => t === '-' || t === '>' || t === 'B';
  const isV = t => t === '|' || t === 'v' || t === 'B';
  const isOccSym = t => t === '-' || t === '|' || t === '>' || t === 'v' || t === 'B';

  const used = Array.from({ length: rows }, () => Array(cols).fill(false));
  const cellMeta = Array.from({ length: rows }, () => Array(cols).fill(null));
  const vehicles = [];
  let nextId = 1;

  // Horizontales
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (used[r][c] || !isH(grid[r][c])) continue;
      let cc = c, len = 0, headAt = -1;
      while (cc < cols && isH(grid[r][cc])) {
        if (grid[r][cc] === '>' || grid[r][cc] === 'B') headAt = cc;
        cc++; len++;
      }
      if (headAt === -1) continue;
      const startCol = headAt - (len - 1);
      if (startCol < 0) continue;

      const id = nextId++;
      const isTarget = (grid[r][headAt] === 'B');
      for (let j = 0; j < len; j++) {
        used[r][startCol + j] = true;
        cellMeta[r][startCol + j] = { id, orient:'H', head:false, length:len, isTarget };
      }
      cellMeta[r][headAt].head = true;
      vehicles.push({ id, orient:'H', length:len, head:{ r, c: headAt }, isTarget });
      c = cc - 1;
    }
  }

  // Verticales
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (used[r][c] || !isV(grid[r][c])) continue;
      let rr = r, len = 0, headAt = -1;
      while (rr < rows && isV(grid[rr][c])) {
        if (grid[rr][c] === 'v' || grid[rr][c] === 'B') headAt = rr;
        rr++; len++;
      }
      if (headAt === -1) continue;
      const startRow = headAt - (len - 1);
      if (startRow < 0) continue;

      const id = nextId++;
      const isTarget = (grid[headAt][c] === 'B');
      for (let i = 0; i < len; i++) {
        used[startRow + i][c] = true;
        cellMeta[startRow + i][c] = { id, orient:'V', head:false, length:len, isTarget };
      }
      cellMeta[headAt][c].head = true;
      vehicles.push({ id, orient:'V', length:len, head:{ r: headAt, c }, isTarget });
      r = rr - 1;
    }
  }

  // Colores (únicos); B en rojo fijo
  const colorMap = new Map();
  const GOAL_COLOR = '#ef4444';
  let colorIndex = 0;
  const nextColor = () => {
    const hue = (colorIndex * 137.508) % 360; colorIndex++;
    const safeHue = (hue > 345 || hue < 15) ? (hue + 30) % 360 : hue;
    return `hsl(${safeHue} 75% 45%)`;
  };
  for (const v of vehicles) if (v.isTarget) colorMap.set(v.id, GOAL_COLOR);
  for (const v of vehicles) if (!colorMap.has(v.id)) colorMap.set(v.id, nextColor());

  // Pintar
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) {
      const warn = document.createElement('div');
      warn.style.color = '#b91c1c'; warn.style.marginTop = '8px';
      warn.textContent = `⚠️ La fila ${r+1} tiene ${grid[r].length} columnas (deberían ser ${cols}).`;
      mount.appendChild(warn);
    }
    for (let c = 0; c < grid[r].length; c++) {
      const meta = cellMeta[r][c];
      const cell = document.createElement('div');

      if (meta) {
        const bg = colorMap.get(meta.id);
        cell.className = 'blockcell occ' + (meta.head ? ' head' : '');
        cell.style.background = bg;
        // Cabeza: B si es objetivo; si no, flecha de orientación
        if (meta.head) {
          cell.textContent = meta.isTarget ? 'B' : (meta.orient === 'H' ? '→' : '↓');
        } else {
          cell.textContent = '';
        }
      } else {
        cell.className = 'blockcell empty';
        cell.textContent = '';
      }
      gridEl.appendChild(cell);
    }
  }
}
