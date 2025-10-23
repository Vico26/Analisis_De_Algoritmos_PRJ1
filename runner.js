// /runner.js
// Orquesta: parsea tu matriz, infiere salida si falta, resuelve y anima en el viewer.

import { parseGrid } from './parser.js';
import { State, validateState, isGoal, hashState } from './board.js';
import { neighbors } from './moves.js';
import { astar, bfs, makeProblem, heuristic } from './search.js';
import { renderBlocksWithHeads } from './matrix_viewer.js';
import { backtrack } from './backtracking.js'; 
import { dfs } from './dfs.js';

// Render helpers
const matrixEl = document.getElementById('matrix');
const preEl = document.getElementById('inputText');
const statusEl = document.getElementById('status');
const movesListEl = document.getElementById('movesList');
const solveAStarBtn = document.getElementById('solveAStar');
const solveBFSBtn = document.getElementById('solveBFS');
const solveDFSBtn = document.getElementById('solveDFS');
const solveBTBtn = document.getElementById('solveBT');
const updateBoardBtn = document.getElementById('updateBoard');
const resetBoardBtn = document.getElementById('resetBoard');
const matrixInput = document.getElementById('matrixInput');
const exitXInput = document.getElementById('exitX');
const exitYInput = document.getElementById('exitY');

// Estado global
let currentState = null;
let currentProblem = null;

// Valores por defecto
const DEFAULT_MATRIX = `- - - - > . .
. . . . . . .
| . . - - - >
| . . . . . .
v . - - - B .
. . . . . . .
- - - - > . .`;
const DEFAULT_EXIT_X = 6;
const DEFAULT_EXIT_Y = 5;

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

// Función auxiliar para aplicar movimiento
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

// Función para resetear todo
function resetBoard() {
  // Restaurar valores por defecto
  matrixInput.value = DEFAULT_MATRIX;
  exitXInput.value = DEFAULT_EXIT_X;
  exitYInput.value = DEFAULT_EXIT_Y;
  
  // Limpiar estado
  currentState = null;
  currentProblem = null;
  
  // Limpiar interfaz
  clearMoves();
  matrixEl.innerHTML = '';
  preEl.textContent = '(aquí se mostrará tu matriz)';
  setStatus('🔄 Tablero reseteado. Listo para ingresar nueva configuración.');
}

// Función para actualizar el tablero desde los inputs
function updateBoardFromInputs() {
  try {
    const matrixText = matrixInput.value.trim();
    const exitX = parseInt(exitXInput.value);
    const exitY = parseInt(exitYInput.value);

    if (!matrixText) {
      setStatus('Ingresa una matriz válida.');
      return;
    }

    if (isNaN(exitX) || isNaN(exitY) || exitX < 1 || exitY < 1) {
      setStatus('Ingresa coordenadas de salida válidas (1-index).');
      return;
    }

    const { rows, cols, vehicles, targetId } = parseGrid(matrixText);
    
    // Configurar salida personalizada (convertir de 1-index a 0-index)
    currentState = new State(
      rows, 
      cols, 
      [exitX - 1, exitY - 1],
      vehicles, 
      targetId
    );
    
    validateState(currentState);

    currentProblem = makeProblem({
      initial: currentState,
      isGoal,
      neighbors,
      hash: hashState
    });

    // Pintar tablero
    renderBlocksWithHeads(matrixText, matrixEl);
    preEl.textContent = matrixText;
    setStatus(`✅ Tablero actualizado. Salida: (${exitX},${exitY}). Listo para resolver.`);

  } catch (error) {
    setStatus(`Error: ${error.message}`);
    console.error('Error al actualizar tablero:', error);
  }
}

// Función para resolver y animar
async function solveAndAnimate(useAlgorithm) {
  try {
    if (!currentProblem || !currentState) {
      setStatus('Primero actualiza el tablero con una matriz válida.');
      return;
    }

    clearMoves();
    setStatus(`Resolviendo con ${useAlgorithm}...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));

    let result;
    if (useAlgorithm === 'bfs') {
      result = bfs(currentProblem);
    } else if (useAlgorithm === 'dfs') {
      result = dfs(currentProblem);
    } else if (useAlgorithm === 'backtracking') {
      result = backtrack(currentProblem);
    } else {
      result = astar(currentProblem, heuristic);
    }

    if (!result.ok) {
      setStatus('Sin solución encontrada.');
      if (result.metrics) {
        setStatus(`Sin solución. Tiempo: ${result.metrics.time.toFixed(2)}ms, Estados: ${result.metrics.statesExplored}`);
      }
      return;
    }

    console.log(`OK: ${result.moves.length} movimientos`);
    console.log('Métricas:', result.metrics);
    
    // Mostrar métricas en el status
    const metrics = result.metrics;
    let metricsText = `${metrics.moves} movimientos | `;
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
    displayAllMoves(result.moves, currentState);

    // Animar
    const pathStates = result.states;
    let currentStep = 0;
    
    const tick = () => {
      if (currentStep <= pathStates.length) {
        const animState = currentStep === 0 ? currentState : pathStates[currentStep - 1];
        const txt = stateToText(animState);
        renderBlocksWithHeads(txt, matrixEl);
        preEl.textContent = txt;
        
        // Resaltar el movimiento actual en la lista
        const moveItems = movesListEl.querySelectorAll('li');
        moveItems.forEach((item, idx) => {
          if (idx === currentStep - 1) {
            item.style.background = '#e3f2fd';
            item.style.fontWeight = 'bold';
            item.style.borderLeft = '4px solid #2196f3';
          } else if (idx === currentStep) {
            item.style.background = '#fff3cd';
            item.style.fontWeight = 'bold';
            item.style.borderLeft = '4px solid #ffc107';
          } else {
            item.style.background = '';
            item.style.fontWeight = 'normal';
            item.style.borderLeft = '4px solid transparent';
          }
        });
        
        // Actualizar estado
        if (currentStep > 0) {
          const currentMove = result.moves[currentStep - 1];
          setStatus(`${metricsText} | Paso ${currentStep}/${result.moves.length}: ${getMoveDescription(currentMove, currentState)}`);
        } else {
          setStatus(`${metricsText} | Inicio - Listo para comenzar`);
        }
        
        currentStep++;
        setTimeout(tick, 800);
      } else {
        setStatus(`${metricsText} | ¡Completado!`);
        
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
    setStatus(`Error: ${error.message}`);
    console.error('Error en solveAndAnimate:', error);
  }
}

// Configurar event listeners
if (updateBoardBtn) {
  updateBoardBtn.addEventListener('click', updateBoardFromInputs);
}
if (resetBoardBtn) {
  resetBoardBtn.addEventListener('click', resetBoard);
}
if (solveAStarBtn) {
  solveAStarBtn.addEventListener('click', () => solveAndAnimate('astar'));
}
if (solveBFSBtn) {
  solveBFSBtn.addEventListener('click', () => solveAndAnimate('bfs'));
}
if (solveDFSBtn) {
  solveDFSBtn.addEventListener('click', () => solveAndAnimate('dfs'));
}
if (solveBTBtn) {
  solveBTBtn.addEventListener('click', () => solveAndAnimate('backtracking'));
}

// Inicialización
resetBoard(); // Iniciar con valores por defecto