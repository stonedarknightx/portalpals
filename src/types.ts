export type PlayerId = 'player' | 'opponent';

export type CoinType = 'silver' | 'gold';

export interface Coin {
  id: string;
  r: number;
  c: number;
  type: CoinType;
  value: number; // 1 for silver, 3 for gold
}

export type ObstacleType = 'pit' | 'wall' | 'crystal';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  r: number;
  c: number;
  sizeR?: number; // e.g. 2 for 2x2 pit
  sizeC?: number;
  destroyed?: boolean;
}

export type StartingPosition = 'Borders' | 'Corners' | 'Anywhere';
export type ReceivedType = 'Auto' | 'Ranking' | 'Crafting';

export interface PieceDef {
  id: string;
  name: string;
  turnAvailable: number; // 1 if immediate, or 2, 3, 4
  startPosition: StartingPosition;
  movementDesc: string;
  ability: string;
  received: ReceivedType;
  avatarUrl?: string;
  theme?: string;
  description?: string;
  customSpriteUrl?: string;
  accentColor: string;
  secondaryColor: string;
}

export interface BoardPiece {
  id: string;
  defId: string;
  owner: PlayerId;
  r: number;
  c: number;
  hasMovedThisTurn: boolean;
  turnsOnBoard: number;
  moveBonus?: number; // e.g. from Moana stacking or Ursula debuff
  frozen?: boolean;
}

export interface BoardTile {
  r: number;
  c: number;
  isLight: boolean;
  hasIce?: boolean;
}

export interface MoveStep {
  r: number;
  c: number;
}

export interface LegalMove {
  targetR: number;
  targetC: number;
  path: MoveStep[];
  isJump?: boolean;
  coinsCollected?: Coin[];
  specialAction?: 'swap' | 'remove' | 'push' | 'destroy_wall';
}

export interface GameScore {
  player: number;
  opponent: number;
  playerSilver: number;
  playerGold: number;
  opponentSilver: number;
  opponentGold: number;
}

export type GamePhase = 'place' | 'move' | 'round_end' | 'game_over';

export interface GameState {
  boardSize: number; // 5 or 6
  round: number; // 1 to 5
  maxRounds: number;
  currentTurn: PlayerId;
  phase: GamePhase;
  scores: GameScore;
  boardPieces: BoardPiece[];
  playerBench: string[]; // piece def ids
  opponentBench: string[]; // piece def ids
  playerPlayedDefIds: string[];
  opponentPlayedDefIds: string[];
  coins: Coin[];
  obstacles: Obstacle[];
  ice: { r: number; c: number }[]; // Elsa's frozen tiles (melt at round end)
  selectedPieceId: string | null;
  selectedBenchDefId: string | null;
  log: string[];
}

export interface BoardPreset {
  id: string;
  name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Custom';
  size: number;
  obstacles: Obstacle[];
  description: string;
}
