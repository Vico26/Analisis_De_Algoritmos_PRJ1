export class Vehicle {
  /** orientacion: 'H' | 'V' */
  constructor(id, orient, length, row, col) {
    this.id = id;
    this.orient = orient;   // 'H' | 'V'
    this.length = length;   // >= 2
    this.row = row;         // y (0-index internamente)
    this.col = col;         // x (0-index internamente)
  }
}

export class Car extends Vehicle {
  constructor(id, orient, row, col, length = 2) {
    super(id, orient, length, row, col);
  }
}

export class Bus extends Vehicle {
  constructor(id, orient, row, col, length = 3) {
    super(id, orient, length, row, col);
  }
}