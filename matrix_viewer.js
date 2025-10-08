// /matrix_viewer.js
// Muestra el string como matriz (grid de celdas).
export function renderMatrixFromString(text, mount) {
  if (!mount) throw new Error('mount requerido');
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) { mount.textContent = 'Matriz vacía'; return; }
  const grid = lines.map(row => row.split(/\s+/));
  const rows = grid.length, cols = grid[0].length;

  // limpiar y crear contenedor del grid
  mount.innerHTML = '';
  const gridEl = document.createElement('div');
  gridEl.className = 'mgrid';
  gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell))`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, var(--cell))`;
  mount.appendChild(gridEl);

  // pintar celdas
  for (let r = 0; r < rows; r++) {
    if (grid[r].length !== cols) {
      const warn = document.createElement('div');
      warn.style.color = '#b91c1c';
      warn.style.marginTop = '8px';
      warn.textContent = `⚠️ La fila ${r+1} tiene ${grid[r].length} columnas (deberían ser ${cols}).`;
      mount.appendChild(warn);
    }
    for (let c = 0; c < grid[r].length; c++) {
      const tok = grid[r][c];
      const cell = document.createElement('div');
      const cls = classForToken(tok, grid, r, c);
      cell.className = `mcell ${cls}`;
      cell.textContent = tok;
      gridEl.appendChild(cell);
    }
  }
}

/* Marca clases para colorear un poco según orientación */
function classForToken(tok, grid, r, c) {
  if (tok === '.') return 'sym-dot';
  if (tok === '-') return 'sym-dash';
  if (tok === '>') return 'sym-gt';
  if (tok === '|') return 'sym-pipe';
  if (tok === 'v') return 'sym-v';
  if (tok === 'B') {
    // si hay señales verticales alrededor, lo pintamos como vertical
    const up = grid[r-1]?.[c], dn = grid[r+1]?.[c];
    const verticalish = (up === '|' || dn === 'v' || dn === '|');
    return verticalish ? 'sym-Bv' : 'sym-Bh';
  }
  return '';
}

