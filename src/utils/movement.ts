import { BoardPiece, Coin, LegalMove, MoveStep, Obstacle, PieceDef } from '../types';
import { PIECES, PASS_PIECE_IDS } from '../data/pieces';

export function isInsideBoard(r: number, c: number, size: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

export function isPitTile(r: number, c: number, obstacles: Obstacle[]): boolean {
  for (const obs of obstacles) {
    if (obs.destroyed) continue;
    if (obs.type === 'pit') {
      const szR = obs.sizeR || 2;
      const szC = obs.sizeC || 2;
      if (r >= obs.r && r < obs.r + szR && c >= obs.c && c < obs.c + szC) {
        return true;
      }
    }
  }
  return false;
}

export function isWallTile(r: number, c: number, obstacles: Obstacle[]): Obstacle | null {
  for (const obs of obstacles) {
    if (obs.destroyed) continue;
    if (obs.type === 'wall' && obs.r === r && obs.c === c) {
      return obs;
    }
  }
  return null;
}

/** Walls and crystal patches can never be landed on. Walkers cannot cross them either
 *  (Stitch may cross walls). Jumpers ignore them while airborne. */
export function isSolidTile(r: number, c: number, obstacles: Obstacle[], passWalls = false): boolean {
  if (isCrystalTile(r, c, obstacles)) return true;
  return !passWalls && !!isWallTile(r, c, obstacles);
}

export function isCrystalTile(r: number, c: number, obstacles: Obstacle[]): Obstacle | null {
  for (const obs of obstacles) {
    if (obs.destroyed) continue;
    if (obs.type === 'crystal' && obs.r === r && obs.c === c) {
      return obs;
    }
  }
  return null;
}

export function getPieceAt(r: number, c: number, pieces: BoardPiece[]): BoardPiece | null {
  return pieces.find(p => p.r === r && p.c === c) || null;
}

export function isStartingPositionValid(
  def: PieceDef,
  r: number,
  c: number,
  size: number,
  obstacles: Obstacle[],
  pieces: BoardPiece[]
): boolean {
  if (!isInsideBoard(r, c, size)) return false;
  if (isPitTile(r, c, obstacles)) return false;
  if (isSolidTile(r, c, obstacles)) return false;
  if (getPieceAt(r, c, pieces)) return false;

  const isCorner = (r === 0 || r === size - 1) && (c === 0 || c === size - 1);
  const isBorder = r === 0 || r === size - 1 || c === 0 || c === size - 1;

  if (def.startPosition === 'Corners') {
    return isCorner;
  }
  if (def.startPosition === 'Borders') {
    return isBorder;
  }
  return true; // Anywhere
}

export function calculateLegalMoves(
  piece: BoardPiece,
  def: PieceDef,
  boardSize: number,
  obstacles: Obstacle[],
  pieces: BoardPiece[],
  coins: Coin[]
): LegalMove[] {
  const moves: LegalMove[] = [];
  const startR = piece.r;
  const startC = piece.c;

  const passWalls = def.id === 'stitch';
  const canPassThroughPieces = PASS_PIECE_IDS.includes(def.id);

  // Helper to validate and build legal move
  const addMoveIfValid = (
    path: MoveStep[],
    isJump: boolean = false,
    forcedTarget?: { r: number; c: number }
  ) => {
    if (path.length === 0) return;
    const target = forcedTarget || path[path.length - 1];
    const { r: tr, c: tc } = target;

    if (!isInsideBoard(tr, tc, boardSize)) return;
    if (isPitTile(tr, tc, obstacles)) return; // No piece may land inside pit

    if (isSolidTile(tr, tc, obstacles)) return; // never land on walls or crystals

    const occupant = getPieceAt(tr, tc, pieces);
    let specialAction: 'swap' | 'remove' | 'push' | 'destroy_wall' | undefined;

    if (occupant) {
      if (occupant.id === piece.id) return; // cannot land on self
      if (def.id === 'daisy' && occupant.owner !== piece.owner) {
        specialAction = 'swap';
      } else if (def.id === 'scar' && isJump) {
        specialAction = 'remove';
      } else {
        // occupied by friendly or non-attackable opponent
        return;
      }
    }

    // Determine coins collected along the path
    const coinsCollected: Coin[] = [];
    const visitedSet = new Set<string>();

    const stepsToCollect = isJump ? [target] : path;
    for (const step of stepsToCollect) {
      const coin = coins.find(c => c.r === step.r && c.c === step.c);
      if (coin && !visitedSet.has(coin.id)) {
        coinsCollected.push(coin);
        visitedSet.add(coin.id);
      }
    }

    // Deduplicate moves to same target with worse or duplicate path
    const existing = moves.find(m => m.targetR === tr && m.targetC === tc);
    if (!existing) {
      moves.push({
        targetR: tr,
        targetC: tc,
        path,
        isJump,
        coinsCollected,
        specialAction,
      });
    }
  };

  // Straight line raycasting (orthogonal or 8-way)
  const raycast = (
    dirs: [number, number][],
    maxSteps: number,
    stopAtObstacle: boolean = false
  ) => {
    // Range buffs/penalties (Fairy Godmother, Moana, Ursula, ice) change straight-line range
    const range = stopAtObstacle ? maxSteps : Math.max(1, maxSteps + (piece.moveBonus || 0));
    dirs.forEach(([dr, dc]) => {
      const curPath: MoveStep[] = [];
      for (let s = 1; s <= range; s++) {
        const nr = startR + dr * s;
        const nc = startC + dc * s;

        if (!isInsideBoard(nr, nc, boardSize)) break;
        if (isPitTile(nr, nc, obstacles)) break;

        if (isSolidTile(nr, nc, obstacles, passWalls)) break;

        const occ = getPieceAt(nr, nc, pieces);
        if (occ && occ.id !== piece.id) {
          if (def.id === 'daisy' && occ.owner !== piece.owner) {
            addMoveIfValid([...curPath, { r: nr, c: nc }]); // lands on opponent -> swap
            break;
          }
          if (!canPassThroughPieces) break;
        }

        curPath.push({ r: nr, c: nc });

        if (stopAtObstacle) {
          // If unlimited until obstacle, continue to end of valid sequence
          const nextR = nr + dr;
          const nextC = nc + dc;
          const hitObstacleOrEdge =
            !isInsideBoard(nextR, nextC, boardSize) ||
            isPitTile(nextR, nextC, obstacles) ||
            (isSolidTile(nextR, nextC, obstacles, passWalls)) ||
            (getPieceAt(nextR, nextC, pieces) && !canPassThroughPieces);

          if (hitObstacleOrEdge) {
            addMoveIfValid([...curPath], false);
            break;
          }
        } else {
          // Range moves allow landing at any valid step along the ray (1, 2, ..., maxSteps)
          addMoveIfValid([...curPath], false);
        }
      }
    });
  };

  const ORTHO: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ANY8: [number, number][] = [...ORTHO, ...DIAG];

  // Specific piece rules:
  switch (def.id) {
    case 'anna':
      // Either 1 horizontal or 3 vertical
      // Horizontal 1
      [[0, -1], [0, 1]].forEach(([dr, dc]) => {
        const nr = startR + dr;
        const nc = startC + dc;
        if (isInsideBoard(nr, nc, boardSize) && !isPitTile(nr, nc, obstacles)) {
          addMoveIfValid([{ r: nr, c: nc }]);
        }
      });
      // Vertical 3
      [[-1, 0], [1, 0]].forEach(([dr, dc]) => {
        const curPath: MoveStep[] = [];
        let blocked = false;
        for (let s = 1; s <= 3; s++) {
          const nr = startR + dr * s;
          const nc = startC + dc * s;
          if (!isInsideBoard(nr, nc, boardSize) || isPitTile(nr, nc, obstacles) || isSolidTile(nr, nc, obstacles, passWalls)) {
            blocked = true;
            break;
          }
          if (getPieceAt(nr, nc, pieces) && s < 3) {
            blocked = true;
            break;
          }
          curPath.push({ r: nr, c: nc });
        }
        if (!blocked && curPath.length === 3) {
          addMoveIfValid(curPath);
        }
      });
      break;

    case 'cinderella':
      // 2 in any direction, then 1 in any direction
      ANY8.forEach(([dr1, dc1]) => {
        const r1 = startR + dr1 * 2;
        const c1 = startC + dc1 * 2;
        // check intermediate step
        const step1 = { r: startR + dr1, c: startC + dc1 };
        if (!isInsideBoard(step1.r, step1.c, boardSize) || isPitTile(step1.r, step1.c, obstacles) || isSolidTile(step1.r, step1.c, obstacles, passWalls)) return;
        if (getPieceAt(step1.r, step1.c, pieces)) return;

        if (!isInsideBoard(r1, c1, boardSize) || isPitTile(r1, c1, obstacles) || isSolidTile(r1, c1, obstacles, passWalls)) return;
        if (getPieceAt(r1, c1, pieces)) return;

        ANY8.forEach(([dr2, dc2]) => {
          const r2 = r1 + dr2;
          const c2 = c1 + dc2;
          if (isInsideBoard(r2, c2, boardSize) && !isPitTile(r2, c2, obstacles)) {
            addMoveIfValid([step1, { r: r1, c: c1 }, { r: r2, c: c2 }]);
          }
        });
      });
      break;

    case 'cogsworth':
      // 1 in any direction, then 2 horizontally or vertically
      ANY8.forEach(([dr1, dc1]) => {
        const r1 = startR + dr1;
        const c1 = startC + dc1;
        if (!isInsideBoard(r1, c1, boardSize) || isPitTile(r1, c1, obstacles) || isSolidTile(r1, c1, obstacles, passWalls)) return;
        if (getPieceAt(r1, c1, pieces)) return;

        ORTHO.forEach(([dr2, dc2]) => {
          const midR = r1 + dr2;
          const midC = c1 + dc2;
          const endR = r1 + dr2 * 2;
          const endC = c1 + dc2 * 2;
          if (!isInsideBoard(midR, midC, boardSize) || isPitTile(midR, midC, obstacles) || isSolidTile(midR, midC, obstacles, passWalls)) return;
          if (getPieceAt(midR, midC, pieces)) return;

          if (isInsideBoard(endR, endC, boardSize) && !isPitTile(endR, endC, obstacles)) {
            addMoveIfValid([{ r: r1, c: c1 }, { r: midR, c: midC }, { r: endR, c: endC }]);
          }
        });
      });
      break;

    case 'daisy':
    case 'donald':
      raycast(ANY8, 3);
      break;

    case 'elsa':
      raycast(ORTHO, 4);
      break;

    case 'eve':
      // 8 in any direction via jumping
      ANY8.forEach(([dr, dc]) => {
        for (let s = 1; s <= 8; s++) {
          const tr = startR + dr * s;
          const tc = startC + dc * s;
          if (isInsideBoard(tr, tc, boardSize) && !isPitTile(tr, tc, obstacles)) {
            addMoveIfValid([{ r: tr, c: tc }], true);
          }
        }
      });
      break;

    case 'fairygodmother':
    case 'forky':
    case 'merlin':
    case 'mikewazowski':
    case 'scrooge':
    case 'sully':
    case 'ursula':
      raycast(ANY8, 2);
      break;

    case 'flynn':
    case 'rapunzel':
      raycast(ANY8, 1);
      break;

    case 'moana':
      raycast(ANY8, 1); // range grows through moveBonus
      break;

    case 'gaston':
    case 'puumba':
    case 'walle':
      raycast(ANY8, boardSize, true);
      break;

    case 'goofy':
      ANY8.forEach(([dr, dc]) => {
        const tr = startR + dr * 3;
        const tc = startC + dc * 3;
        if (isInsideBoard(tr, tc, boardSize) && !isPitTile(tr, tc, obstacles)) {
          addMoveIfValid([{ r: tr, c: tc }], true);
        }
      });
      break;

    case 'kristoff':
      // 1 diagonal in any direction up to 3 times
      // Explore diagonal tree of depth 1, 2, 3
      {
        const dfs = (cr: number, cc: number, depth: number, path: MoveStep[]) => {
          if (depth > 0) {
            addMoveIfValid(path);
          }
          if (depth === 3) return;
          DIAG.forEach(([dr, dc]) => {
            const nr = cr + dr;
            const nc = cc + dc;
            if (isInsideBoard(nr, nc, boardSize) && !isPitTile(nr, nc, obstacles) && !isSolidTile(nr, nc, obstacles, passWalls)) {
              if (!getPieceAt(nr, nc, pieces) || depth === 2) {
                dfs(nr, nc, depth + 1, [...path, { r: nr, c: nc }]);
              }
            }
          });
        };
        dfs(startR, startC, 0, []);
      }
      break;

    case 'lumiere':
      // 1 in any direction, then 2 diagonally
      ANY8.forEach(([dr1, dc1]) => {
        const r1 = startR + dr1;
        const c1 = startC + dc1;
        if (!isInsideBoard(r1, c1, boardSize) || isPitTile(r1, c1, obstacles) || isSolidTile(r1, c1, obstacles, passWalls)) return;
        if (getPieceAt(r1, c1, pieces)) return;

        DIAG.forEach(([dr2, dc2]) => {
          const midR = r1 + dr2;
          const midC = c1 + dc2;
          const endR = r1 + dr2 * 2;
          const endC = c1 + dc2 * 2;
          if (!isInsideBoard(midR, midC, boardSize) || isPitTile(midR, midC, obstacles) || isSolidTile(midR, midC, obstacles, passWalls)) return;
          if (getPieceAt(midR, midC, pieces)) return;

          if (isInsideBoard(endR, endC, boardSize) && !isPitTile(endR, endC, obstacles)) {
            addMoveIfValid([{ r: r1, c: c1 }, { r: midR, c: midC }, { r: endR, c: endC }]);
          }
        });
      });
      break;

    case 'mickey':
    case 'ralph':
    case 'stitch':
      raycast(ORTHO, 3);
      break;

    case 'minnie':
      raycast(DIAG, 3);
      break;

    case 'nala':
      // 2 diagonal up to 2x via jumping
      DIAG.forEach(([dr, dc]) => {
        const r1 = startR + dr * 2;
        const c1 = startC + dc * 2;
        if (isInsideBoard(r1, c1, boardSize) && !isPitTile(r1, c1, obstacles)) {
          addMoveIfValid([{ r: r1, c: c1 }], true);
          // 2nd jump
          DIAG.forEach(([dr2, dc2]) => {
            const r2 = r1 + dr2 * 2;
            const c2 = c1 + dc2 * 2;
            if (isInsideBoard(r2, c2, boardSize) && !isPitTile(r2, c2, obstacles)) {
              addMoveIfValid([{ r: r1, c: c1 }, { r: r2, c: c2 }], true);
            }
          });
        }
      });
      break;

    case 'olaf':
      // 1 in any direction up to 2 times
      ANY8.forEach(([dr1, dc1]) => {
        const r1 = startR + dr1;
        const c1 = startC + dc1;
        if (isInsideBoard(r1, c1, boardSize) && !isPitTile(r1, c1, obstacles) && !isSolidTile(r1, c1, obstacles, passWalls)) {
          addMoveIfValid([{ r: r1, c: c1 }]);
          if (!getPieceAt(r1, c1, pieces)) {
            ANY8.forEach(([dr2, dc2]) => {
              const r2 = r1 + dr2;
              const c2 = c1 + dc2;
              if (isInsideBoard(r2, c2, boardSize) && !isPitTile(r2, c2, obstacles)) {
                addMoveIfValid([{ r: r1, c: c1 }, { r: r2, c: c2 }]);
              }
            });
          }
        }
      });
      break;

    case 'oswald':
      // 1 horiz/vert + 1 diag up to 2x
      ORTHO.forEach(([dr1, dc1]) => {
        const r1 = startR + dr1;
        const c1 = startC + dc1;
        if (!isInsideBoard(r1, c1, boardSize) || isPitTile(r1, c1, obstacles) || isSolidTile(r1, c1, obstacles, passWalls)) return;
        if (getPieceAt(r1, c1, pieces)) return;

        DIAG.forEach(([dr2, dc2]) => {
          const r2 = r1 + dr2;
          const c2 = c1 + dc2;
          if (isInsideBoard(r2, c2, boardSize) && !isPitTile(r2, c2, obstacles)) {
            addMoveIfValid([{ r: r1, c: c1 }, { r: r2, c: c2 }]);
          }
        });
      });
      break;

    case 'rafiki':
    case 'scar':
      // 4 in any direction via jumping
      ANY8.forEach(([dr, dc]) => {
        const tr = startR + dr * 4;
        const tc = startC + dc * 4;
        if (isInsideBoard(tr, tc, boardSize) && !isPitTile(tr, tc, obstacles)) {
          addMoveIfValid([{ r: tr, c: tc }], true);
        }
      });
      break;

    case 'remy':
      // 2 diag up to 2x
      DIAG.forEach(([dr1, dc1]) => {
        const midR1 = startR + dr1;
        const midC1 = startC + dc1;
        const r1 = startR + dr1 * 2;
        const c1 = startC + dc1 * 2;
        if (!isInsideBoard(midR1, midC1, boardSize) || isPitTile(midR1, midC1, obstacles) || isSolidTile(midR1, midC1, obstacles, passWalls)) return;
        if (!isInsideBoard(r1, c1, boardSize) || isPitTile(r1, c1, obstacles) || isSolidTile(r1, c1, obstacles, passWalls)) return;

        addMoveIfValid([{ r: midR1, c: midC1 }, { r: r1, c: c1 }]);

        if (!getPieceAt(r1, c1, pieces)) {
          DIAG.forEach(([dr2, dc2]) => {
            const midR2 = r1 + dr2;
            const midC2 = c1 + dc2;
            const r2 = r1 + dr2 * 2;
            const c2 = c1 + dc2 * 2;
            if (!isInsideBoard(midR2, midC2, boardSize) || isPitTile(midR2, midC2, obstacles) || isSolidTile(midR2, midC2, obstacles, passWalls)) return;
            if (isInsideBoard(r2, c2, boardSize) && !isPitTile(r2, c2, obstacles)) {
              addMoveIfValid([
                { r: midR1, c: midC1 },
                { r: r1, c: c1 },
                { r: midR2, c: midC2 },
                { r: r2, c: c2 },
              ]);
            }
          });
        }
      });
      break;

    case 'simba':
      // 2 horiz/vert up to 2x via jumping
      ORTHO.forEach(([dr, dc]) => {
        const r1 = startR + dr * 2;
        const c1 = startC + dc * 2;
        if (isInsideBoard(r1, c1, boardSize) && !isPitTile(r1, c1, obstacles)) {
          addMoveIfValid([{ r: r1, c: c1 }], true);
          ORTHO.forEach(([dr2, dc2]) => {
            const r2 = r1 + dr2 * 2;
            const c2 = c1 + dc2 * 2;
            if (isInsideBoard(r2, c2, boardSize) && !isPitTile(r2, c2, obstacles)) {
              addMoveIfValid([{ r: r1, c: c1 }, { r: r2, c: c2 }], true);
            }
          });
        }
      });
      break;

    default:
      // Default fallback: 1 step in any direction
      raycast(ANY8, 1);
      break;
  }

  return moves;
}
