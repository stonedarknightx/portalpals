import { BoardPiece, Coin, GameState, LegalMove, Obstacle } from '../types';
import { PIECES } from '../data/pieces';
import { calculateLegalMoves, isStartingPositionValid } from './movement';

export interface AIDecision {
  action: 'place' | 'move' | 'skip_place' | 'pass';
  pieceDefId?: string;
  pieceId?: string;
  targetR?: number;
  targetC?: number;
  move?: LegalMove;
}

export function computeAIPlacement(state: GameState): AIDecision | null {
  const opponentPiecesOnBoard = state.boardPieces.filter(p => p.owner === 'opponent');
  if (opponentPiecesOnBoard.length >= 3) {
    return { action: 'skip_place' };
  }

  // Find playable bench pieces: MUST NOT already be on the board or previously deployed
  const playableDefs = state.opponentBench
    .filter(id => !state.boardPieces.some(p => p.owner === 'opponent' && p.defId === id))
    .filter(id => !state.opponentPlayedDefIds.includes(id))
    .map(id => PIECES[id])
    .filter(def => def && def.turnAvailable <= state.round);

  if (playableDefs.length === 0) {
    return { action: 'skip_place' };
  }

  let bestChoice: { defId: string; r: number; c: number; score: number } | null = null;

  for (const def of playableDefs) {
    for (let r = 0; r < state.boardSize; r++) {
      for (let c = 0; c < state.boardSize; c++) {
        if (!isStartingPositionValid(def, r, c, state.boardSize, state.obstacles, state.boardPieces)) {
          continue;
        }

        // Evaluate starting tile score based on distance to coins
        let tileScore = 0;
        state.coins.forEach(coin => {
          const dist = Math.abs(coin.r - r) + Math.abs(coin.c - c);
          const val = coin.type === 'gold' ? 6 : 2;
          tileScore += Math.max(0, val - dist);
        });

        if (!bestChoice || tileScore > bestChoice.score) {
          bestChoice = { defId: def.id, r, c, score: tileScore };
        }
      }
    }
  }

  if (bestChoice) {
    return {
      action: 'place',
      pieceDefId: bestChoice.defId,
      targetR: bestChoice.r,
      targetC: bestChoice.c,
    };
  }

  return { action: 'skip_place' };
}

export function computeAIMove(state: GameState): AIDecision | null {
  const unmovedPieces = state.boardPieces.filter(
    p => p.owner === 'opponent' && !p.hasMovedThisTurn
  );

  if (unmovedPieces.length === 0) {
    return { action: 'pass' };
  }

  let bestMoveChoice: {
    piece: BoardPiece;
    move: LegalMove;
    score: number;
  } | null = null;

  for (const piece of unmovedPieces) {
    const def = PIECES[piece.defId];
    if (!def) continue;

    const legalMoves = calculateLegalMoves(
      piece,
      def,
      state.boardSize,
      state.obstacles,
      state.boardPieces,
      state.coins
    );

    for (const move of legalMoves) {
      let moveScore = 0;

      // Coins collected
      if (move.coinsCollected) {
        for (const coin of move.coinsCollected) {
          moveScore += coin.type === 'gold' ? 30 : 10;
        }
      }

      // Special actions
      if (move.specialAction === 'remove') {
        moveScore += 50; // Scar attack!
      } else if (move.specialAction === 'swap') {
        moveScore += 20; // Daisy swap
      } else if (move.specialAction === 'destroy_wall') {
        moveScore += 15;
      }

      // Proximity to other coins
      for (const coin of state.coins) {
        const dist = Math.abs(coin.r - move.targetR) + Math.abs(coin.c - move.targetC);
        moveScore += Math.max(0, 5 - dist);
      }

      if (!bestMoveChoice || moveScore > bestMoveChoice.score) {
        bestMoveChoice = {
          piece,
          move,
          score: moveScore,
        };
      }
    }
  }

  if (bestMoveChoice) {
    return {
      action: 'move',
      pieceId: bestMoveChoice.piece.id,
      targetR: bestMoveChoice.move.targetR,
      targetC: bestMoveChoice.move.targetC,
      move: bestMoveChoice.move,
    };
  }

  // If no moves available for any piece, mark first piece as moved to prevent deadlock
  return {
    action: 'pass',
    pieceId: unmovedPieces[0].id,
  };
}
