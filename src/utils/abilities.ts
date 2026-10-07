import { BoardPiece, Coin, Obstacle } from '../types';
import { getPieceAt, isInsideBoard, isPitTile, isSolidTile } from './movement';

type Pt = { r: number; c: number };
export const isNear = (a: Pt, b: Pt) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c)) === 1;

export interface MoveEffectInput {
  moverId: string;
  defId: string;
  path: Pt[];
  isJump?: boolean;
  collectedCount: number;
  pieces: BoardPiece[]; // already updated with the mover on its new tile
  obstacles: Obstacle[];
  coins: Coin[];
  ice: Pt[];
  size: number;
}
export interface MoveEffectResult {
  pieces: BoardPiece[];
  obstacles: Obstacle[];
  coins: Coin[];
  ice: Pt[];
  gainedSilver: number;
  gainedGold: number;
  endTurn: boolean;
  logs: string[];
}

/** Abilities that trigger when a piece finishes its move. */
export function applyMoveEffects(i: MoveEffectInput): MoveEffectResult {
  let { pieces, obstacles, coins, ice } = i;
  const logs: string[] = [];
  let gainedSilver = 0;
  let gainedGold = 0;
  let endTurn = false;
  const me = pieces.find(p => p.id === i.moverId);
  if (!me) return { pieces, obstacles, coins, ice, gainedSilver, gainedGold, endTurn, logs };
  const at: Pt = { r: me.r, c: me.c };

  const destroyWalls = (pred: (o: Obstacle) => boolean, label: string) => {
    let n = 0;
    obstacles = obstacles.map(o => {
      if (o.type === 'wall' && !o.destroyed && pred(o)) { n++; return { ...o, destroyed: true }; }
      return o;
    });
    if (n) logs.push(`${label} smashed ${n} stone wall${n > 1 ? 's' : ''}!`);
  };
  const takeCoin = (c: Coin) => {
    coins = coins.filter(k => k.id !== c.id);
    if (c.type === 'gold') gainedGold++; else gainedSilver++;
  };

  // Stitch tunnels through walls on his path and destroys them
  if (i.defId === 'stitch' && !i.isJump) {
    destroyWalls(o => i.path.some(s => s.r === o.r && s.c === o.c), 'Stitch');
  }
  // Puumba / Ralph smash walls next to where they finish
  if (i.defId === 'puumba' || i.defId === 'ralph') {
    destroyWalls(o => isNear(at, o), i.defId === 'puumba' ? 'Puumba' : 'Ralph');
  }

  // Push abilities: WALL-E (1), Rafiki (1), Sully (2, and he keeps coins the pushed piece passes over)
  const pushDist = ({ walle: 1, rafiki: 1, sully: 2 } as Record<string, number>)[i.defId];
  if (pushDist) {
    pieces = pieces.map(p => {
      if (p.id === me.id || !isNear(at, p)) return p;
      const dr = Math.sign(p.r - at.r), dc = Math.sign(p.c - at.c);
      let { r, c } = p;
      for (let s = 0; s < pushDist; s++) {
        const nr = r + dr, nc = c + dc;
        if (!isInsideBoard(nr, nc, i.size) || isPitTile(nr, nc, obstacles) || isSolidTile(nr, nc, obstacles) ||
            pieces.some(o => o.id !== p.id && o.r === nr && o.c === nc)) break;
        r = nr; c = nc;
        if (i.defId === 'sully') {
          const coin = coins.find(k => k.r === r && k.c === c);
          if (coin) takeCoin(coin);
        }
      }
      return r === p.r && c === p.c ? p : { ...p, r, c };
    });
  }

  // Rapunzel scoops up to 3 coins around her
  if (i.defId === 'rapunzel') {
    coins
      .filter(k => isNear(at, k))
      .slice(0, 3)
      .forEach(takeCoin);
  }

  // Elsa freezes every tile she crosses; others that stop on ice slip (-1 range next turn)
  if (i.defId === 'elsa') {
    i.path.forEach(s => { if (!ice.some(t => t.r === s.r && t.c === s.c)) ice = [...ice, { r: s.r, c: s.c }]; });
  } else if (ice.some(t => t.r === at.r && t.c === at.c)) {
    pieces = pieces.map(p => (p.id === me.id ? { ...p, moveBonus: (p.moveBonus || 0) - 1 } : p));
    logs.push('Slipped on ice! -1 range next turn.');
  }

  // Oswald: turn ends immediately if he collected nothing
  if (i.defId === 'oswald' && i.collectedCount === 0 && gainedSilver + gainedGold === 0) {
    endTurn = true;
    logs.push('Oswald found no coins: turn over.');
  }

  return { pieces, obstacles, coins, ice, gainedSilver, gainedGold, endTurn, logs };
}

/** Merlin turns the nearest silver coin (within 2 tiles) gold at the start of his owner's turn. */
export function applyStartOfTurn(
  owner: 'player' | 'opponent',
  pieces: BoardPiece[],
  coins: Coin[]
): { coins: Coin[]; logs: string[] } {
  const logs: string[] = [];
  pieces.filter(p => p.owner === owner && p.defId === 'merlin').forEach(m => {
    const target = coins
      .filter(k => k.type === 'silver' && Math.max(Math.abs(k.r - m.r), Math.abs(k.c - m.c)) <= 2)
      .sort((a, b) => Math.max(Math.abs(a.r - m.r), Math.abs(a.c - m.c)) - Math.max(Math.abs(b.r - m.r), Math.abs(b.c - m.c)))[0];
    if (target) {
      coins = coins.map(k => (k.id === target.id ? { ...k, type: 'gold' as const, value: 3 } : k));
      logs.push('Merlin transformed a silver coin into gold!');
    }
  });
  return { coins, logs };
}
