// /runner.js
// Orquesta: parsea tu matriz, infiere salida si falta, resuelve y anima en el viewer.

import { parseGrid } from './parser.js';
import { State, validateState, isGoal, hashState } from './board.js';
import { neighbors } from './moves.js';
import { astar, bfs, makeProblem, heuristic } from './search.js';
import { renderBlocksWithHeads } from './matrix_viewer.js';
import { backtrack } from './backtracking.js'; 

// === 1) Tu matriz (puedes cambiarla aquí) ===
const TEXT = `- - > . . . . .
. . . . | - - >
. . . . | . . .
. - - B | . . .
. . . . v . - >
. . . . . . . .
- - - > . . . .
. . . . . . . .`;

// === 2) Utils ===
function inferExitFromTarget(s){
  const t = s.vehicles.find(v => v.id === s.targetId);
  if (!t) throw new Error('No hay vehículo objetivo B.');
  if (t.orient === 'H') return [s.cols - 1, t.row];     // borde derecho
  return [t.col, s.rows - 1];                           // borde inferior
}

// Render helpers
const matrixEl = document.getElementById('matrix');
const preEl = document.getElementById('inputText');
const statusEl = document.getElementById('status');
const movesListEl = document.getElementById('movesList');
const solveAStarBtn = document.getElementById('solveAStar');
const solveBFSBtn = document.getElementById('solveBFS');
const solveBTBtn = document.getElementById('solveBT');

function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }
function clearMoves(){ if(movesListEl) movesListEl.innerHTML = ''; }

// Función para obtener descripción del movimiento
function getMoveDescription(move, state) {
  const vehicle = state.vehicles.find(v => v.id === move.vehicleId);
  if (!vehicle) return `Vehículo ${move.vehicleId}: movimiento desconocido`;
  
  const direction = move.delta > 0 ? 
    (vehicle.orient === 'H' ? 'derecha' : 'abajo') : 
    (vehicle.orient === 'H' ? 'izquierda' : 'arriba');
  
  return `🚗 Vehículo ${move.vehicleId}: ${direction}`;
}

// Función para mostrar todos los movimientos de una vez
function displayAllMoves(moves, initialState) {
  if(!movesListEl) return;
  
  movesListEl.innerHTML = '';
  let currentState = initialState;
  
  moves.forEach((move, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${getMoveDescription(move, currentState)}`;
    movesListEl.appendChild(li);
    
    // Actualizar estado para el próximo movimiento
    currentState = applyMoveToState(currentState, move);
  });
}

// Función auxiliar para aplicar movimiento (similar a applyMove de moves.js)
function applyMoveToState(state, move) {
  const newVehicles = state.vehicles.map(v => {
    if (v.id === move.vehicleId) {
      return {
        ...v,
        row: v.orient === 'V' ? v.row + move.delta : v.row,
        col: v.orient === 'H' ? v.col + move.delta : v.col
      };
    }
    return { ...v };
  });
  
  return new State(state.rows, state.cols, state.exit, newVehicles, state.targetId);
}

// Función para convertir estado a texto
function stateToText(s){
  const grid = Array.from({length:s.rows},()=>Array(s.cols).fill('.'));
  for (const v of s.vehicles) {
    if (v.orient==='H') {
      for (let j=0;j<v.length;j++) grid[v.row][v.col+j] = '-';
      grid[v.row][v.col+v.length-1] = (v.id===s.targetId) ? 'B' : '>';
    } else {
      for (let i=0;i<v.length;i++) grid[v.row+i][v.col] = '|';
      grid[v.row+v.length-1][v.col] = (v.id===s.targetId) ? 'B' : 'v';
    }
  }
  return grid.map(r=>r.join(' ')).join('\n');
}

// Función para resolver y animar
async function solveAndAnimate(useAlgorithm) {
  try {
    clearMoves();
    setStatus(`Resolviendo con ${useAlgorithm}...`);
    
    // Pequeño delay para que se vea el mensaje "Resolviendo..."
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const { rows, cols, vehicles, targetId } = parseGrid(TEXT);
    let initialState = new State(rows, cols, [0,0], vehicles, targetId);
    initialState.exit = inferExitFromTarget(initialState);
    validateState(initialState);

    // Pintar inicial
    renderBlocksWithHeads(TEXT, matrixEl);
    setStatus(`Resolviendo...`);

    const problem = makeProblem({
      initial: initialState,
      isGoal,
      neighbors,
      hash: hashState
    });

    // Seleccionar algoritmo
    let result;
    if (useAlgorithm === 'bfs') {
      result = bfs(problem);
    } else if (useAlgorithm === 'backtracking') {
      result = backtrack(problem);
    } else {
      result = astar(problem, heuristic);
    }

    if (!result.ok) {
      setStatus('❌ Sin solución encontrada.');
      // Mostrar métricas incluso si falla
      if (result.metrics) {
        console.log('Métricas:', result.metrics);
        setStatus(`❌ Sin solución. Tiempo: ${result.metrics.time.toFixed(2)}ms, Estados: ${result.metrics.statesExplored}`);
      }
      return;
    }

    console.log(`✅ OK: ${result.moves.length} movimientos`);
    console.log('Métricas:', result.metrics);
    
    // Mostrar métricas en el status
    const metrics = result.metrics;
    let metricsText = `✅ ${metrics.moves} movimientos | `;
    metricsText += `Tiempo: ${metrics.time.toFixed(2)}ms | `;
    metricsText += `Estados: ${metrics.statesExplored}`;
    
    if (metrics.maxOpenList) {
      metricsText += ` | Abierta Máx: ${metrics.maxOpenList}`;
    }
    if (metrics.closedList) {
      metricsText += ` | Cerrada: ${metrics.closedList}`;
    }
    
    setStatus(metricsText);

    // Mostrar todos los movimientos con descripciones claras
    displayAllMoves(result.moves, initialState);

    // Animar
    const pathStates = result.states;
    let currentStep = 0;
    
    const tick = () => {
      if (currentStep <= pathStates.length) {
        const currentState = currentStep === 0 ? initialState : pathStates[currentStep - 1];
        const txt = stateToText(currentState);
        renderBlocksWithHeads(txt, matrixEl);
        preEl.textContent = txt;
        
        // Resaltar el movimiento actual en la lista
        const moveItems = movesListEl.querySelectorAll('li');
        moveItems.forEach((item, idx) => {
          if (idx === currentStep - 1) {
            // Movimiento que se acaba de ejecutar
            item.style.background = '#e3f2fd';
            item.style.fontWeight = 'bold';
            item.style.borderLeft = '4px solid #2196f3';
          } else if (idx === currentStep) {
            // Próximo movimiento
            item.style.background = '#fff3cd';
            item.style.fontWeight = 'bold';
            item.style.borderLeft = '4px solid #ffc107';
          } else {
            // Movimientos no activos
            item.style.background = '';
            item.style.fontWeight = 'normal';
            item.style.borderLeft = '4px solid transparent';
          }
        });
        
        // Actualizar estado
        if (currentStep > 0) {
          const currentMove = result.moves[currentStep - 1];
          setStatus(`${metricsText} | Paso ${currentStep}/${result.moves.length}: ${getMoveDescription(currentMove, initialState)}`);
        } else {
          setStatus(`${metricsText} | 🎯 Inicio - Listo para comenzar`);
        }
        
        currentStep++;
        setTimeout(tick, 800); // Más lento para ver mejor
      } else {
        setStatus(`${metricsText} | ✅ ¡Completado!`);
        
        // Resaltar final
        const moveItems = movesListEl.querySelectorAll('li');
        moveItems.forEach(item => {
          item.style.background = '#d4edda';
          item.style.borderLeft = '4px solid #28a745';
        });
      }
    };
    
    tick();
    
  } catch (error) {
    setStatus(`❌ Error: ${error.message}`);
    console.error('Error en solveAndAnimate:', error);
  }
}

// Configurar event listeners
if (solveAStarBtn) {
  solveAStarBtn.addEventListener('click', () => solveAndAnimate('astar'));
}
if (solveBFSBtn) {
  solveBFSBtn.addEventListener('click', () => solveAndAnimate('bfs'));
}
if (solveBTBtn) {
  solveBTBtn.addEventListener('click', () => solveAndAnimate('backtracking'));
}

// Inicialización
preEl.textContent = TEXT;
renderBlocksWithHeads(TEXT, matrixEl);
setStatus('🎮 Listo. Haz clic en "Resolver" para comenzar.');