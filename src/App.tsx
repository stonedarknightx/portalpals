import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BoardPiece,
  Coin,
  GameState,
  LegalMove,
  Obstacle,
  PieceDef,
  BoardPreset,
  PlayerId,
} from './types';
import { PIECES, randomBench, BOARD_PRESETS } from './data/pieces';
import { calculateLegalMoves, isStartingPositionValid, isPitTile, isSolidTile } from './utils/movement';
import { applyMoveEffects, applyStartOfTurn, isNear } from './utils/abilities';
import { computeAIPlacement, computeAIMove } from './utils/ai';
import { sound } from './utils/audio';
import { DEFAULT_ASSETS } from './utils/assets';
import { IsometricBoard } from './components/IsometricBoard';
import { GameHUD } from './components/GameHUD';
import { RosterModal } from './components/RosterModal';
import { BoardEditorModal } from './components/BoardEditorModal';
import { GameOverModal } from './components/GameOverModal';

// End-of-turn abilities from the rulebook: Scrooge (+1 coin), Moana (stacking speed),
// Forky (vanishes), Cinderella (vanishes after her 5th turn).
function endOfTurn(prev: GameState, owner: PlayerId): GameState {
  let bonus = 0;
  const gone = new Set<string>();
  const used: string[] = [];
  const pieces = prev.boardPieces.map(p => {
    if (p.owner !== owner) return p;
    if (p.defId === 'scrooge') bonus += 1;
    if (p.defId === 'forky' || (p.defId === 'cinderella' && p.turnsOnBoard >= 5)) {
      gone.add(p.id);
      used.push(p.defId);
    }
    if (p.defId === 'moana') return { ...p, moveBonus: (p.moveBonus || 0) + 1 };
    return p;
  }).filter(p => !gone.has(p.id));
  const logs: string[] = [];
  // Mike: every ally standing next to him earns +1 coin
  prev.boardPieces.filter(m => m.owner === owner && m.defId === 'mikewazowski').forEach(m => {
    const n = prev.boardPieces.filter(a => a.owner === owner && a.id !== m.id && isNear(m, a)).length;
    if (n) { bonus += n; logs.push(`Mike's coin buff gives ${n} extra coin${n > 1 ? 's' : ''}.`); }
  });
  // Fairy Godmother buffs adjacent allies (+1 range), Ursula curses adjacent enemies (-1 range)
  const fairies = prev.boardPieces.filter(f => f.owner === owner && f.defId === 'fairygodmother');
  const ursulas = prev.boardPieces.filter(u => u.owner === owner && u.defId === 'ursula');
  const buffed = pieces.map(p => {
    let b = p.moveBonus || 0;
    if (p.owner === owner && fairies.some(f => f.id !== p.id && isNear(f, p))) b += 1;
    if (p.owner !== owner && ursulas.some(u => isNear(u, p))) b -= 1;
    return b === (p.moveBonus || 0) ? p : { ...p, moveBonus: b };
  });
  // Merlin acts at the start of the next player's turn
  const next = owner === 'player' ? 'opponent' : 'player';
  const sot = applyStartOfTurn(next, buffed, prev.coins);
  const key = owner === 'player' ? 'player' : 'opponent';
  const sc = prev.scores;
  return {
    ...prev,
    coins: sot.coins,
    boardPieces: buffed,
    scores: {
      ...sc,
      [key]: sc[key] + bonus,
      [key + 'Silver']: (sc as any)[key + 'Silver'] + bonus,
    },
    log: [...prev.log, ...(bonus ? [`${owner} earns +${bonus} bonus coin(s) from abilities.`] : []), ...logs, ...sot.logs],
  };
}

export default function App() {
  // Asset state (custom/default transparent images)
  const assets = DEFAULT_ASSETS;

  // Sound enabled
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active presets & boards (fixed 8x8)
  const [activePreset, setActivePreset] = useState<BoardPreset>(BOARD_PRESETS[1]);

  // Modals
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isBoardEditorOpen, setIsBoardEditorOpen] = useState(false);

  // Animation & Visual FX
  const [animatingPiece, setAnimatingPiece] = useState<{
    pieceId: string;
    currentR: number;
    currentC: number;
  } | null>(null);

  const [scorePopups, setScorePopups] = useState<
    { id: string; r: number; c: number; text: string; color: string }[]
  >([]);

  // Bench configuration
  const [playerBench, setPlayerBench] = useState<string[]>(() => randomBench());
  const [opponentBench] = useState<string[]>(() => randomBench());

  // Initial Game State Generator (board)
  const createInitialState = useCallback(
    (preset: BoardPreset, customBench?: string[]): GameState => {
      const size = 8; // fixed 8x8 board
      const obstacles = JSON.parse(JSON.stringify(preset.obstacles)) as Obstacle[];

      // Generate Coins
      const coins: Coin[] = [];
      const occupied = new Set<string>();

      // Crystal patches are solid obstacles: keep coins off them
      obstacles.forEach(o => {
        if (o.type === 'crystal') occupied.add(`${o.r},${o.c}`);
      });

      // Spawn 8 silver coins and 4 additional gold coins on the board
      const silverN = Math.round(size * 0.9), goldN = Math.max(2, Math.round(size / 2.5));
      const coinTypes: ('silver' | 'gold')[] = [
        ...Array(silverN).fill('silver'),
        ...Array(goldN).fill('gold'),
      ];

      for (let i = 0; i < coinTypes.length; i++) {
        let attempts = 0;
        while (attempts < 60) {
          attempts++;
          const r = Math.floor(Math.random() * size);
          const c = Math.floor(Math.random() * size);
          const key = `${r},${c}`;

          if (occupied.has(key)) continue;
          if (isPitTile(r, c, obstacles)) continue;
          if (isSolidTile(r, c, obstacles)) continue;

          occupied.add(key);
          const type = coinTypes[i];
          coins.push({
            id: `coin-${i}-${Date.now()}`,
            r,
            c,
            type,
            value: type === 'gold' ? 3 : 1,
          });
          break;
        }
      }

      return {
        boardSize: size,
        round: 1,
        maxRounds: 5,
        currentTurn: 'player',
        phase: 'place',
        scores: {
          player: 0,
          opponent: 0,
          playerSilver: 0,
          playerGold: 0,
          opponentSilver: 0,
          opponentGold: 0,
        },
        boardPieces: [],
        playerBench: customBench || playerBench,
        opponentBench: [...opponentBench],
        playerPlayedDefIds: [],
        opponentPlayedDefIds: [],
        coins,
        obstacles,
        ice: [],
        selectedPieceId: null,
        selectedBenchDefId: null,
        log: [`Match started! Round 1 of 5. Deploy your first figurine on the ${size}x${size} board.`],
      };
    },
    [playerBench, opponentBench]
  );

  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialState(BOARD_PRESETS[1])
  );

  // Sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setEnabled(next);
  };

  // Score popup helper
  const addScorePopup = (r: number, c: number, text: string, color: string) => {
    const id = `popup-${Date.now()}-${Math.random()}`;
    setScorePopups(prev => [...prev, { id, r, c, text, color }]);
    setTimeout(() => {
      setScorePopups(prev => prev.filter(p => p.id !== id));
    }, 800);
  };

  // Restart match
  const handleRestartMatch = () => {
    setGameState(createInitialState(activePreset, playerBench));
  };

  // Select board preset
  const handleSelectPreset = (preset: BoardPreset) => {
    setActivePreset(preset);
    setGameState(createInitialState(preset, playerBench));
  };

  // Apply custom board
  const handleApplyCustomBoard = (size: number, obstacles: Obstacle[]) => {
    const customPreset: BoardPreset = {
      id: `custom-${Date.now()}`,
      name: `Custom Board (${size}x${size})`,
      difficulty: 'Custom',
      size,
      obstacles,
      description: 'Player constructed custom modular board layout.',
    };
    setActivePreset(customPreset);
    setGameState(createInitialState(customPreset, playerBench));
  };

  // Legal moves for currently selected piece
  const legalMoves = React.useMemo(() => {
    if (gameState.phase !== 'move' || !gameState.selectedPieceId) return [];
    const piece = gameState.boardPieces.find(p => p.id === gameState.selectedPieceId);
    if (!piece || piece.owner !== gameState.currentTurn || piece.hasMovedThisTurn) return [];
    const def = PIECES[piece.defId];
    if (!def) return [];

    return calculateLegalMoves(
      piece,
      def,
      gameState.boardSize,
      gameState.obstacles,
      gameState.boardPieces,
      gameState.coins
    );
  }, [gameState]);

  // Valid starting tiles for selected bench piece
  const validStartTiles = React.useMemo(() => {
    if (gameState.phase !== 'place' || !gameState.selectedBenchDefId) return [];
    const def = PIECES[gameState.selectedBenchDefId];
    if (!def) return [];

    const valid: { r: number; c: number }[] = [];
    for (let r = 0; r < gameState.boardSize; r++) {
      for (let c = 0; c < gameState.boardSize; c++) {
        if (
          isStartingPositionValid(
            def,
            r,
            c,
            gameState.boardSize,
            gameState.obstacles,
            gameState.boardPieces
          )
        ) {
          valid.push({ r, c });
        }
      }
    }
    return valid;
  }, [gameState]);

  // Tapping a Bench piece to place
  const handleSelectBenchPiece = (defId: string) => {
    if (gameState.phase !== 'place') {
      // In move phase, find piece on board
      const piece = gameState.boardPieces.find(
        p => p.defId === defId && p.owner === gameState.currentTurn
      );
      if (piece) {
        setGameState(prev => ({
          ...prev,
          selectedPieceId: piece.id,
          selectedBenchDefId: null,
        }));
      }
      return;
    }

    setGameState(prev => ({
      ...prev,
      selectedBenchDefId: defId === prev.selectedBenchDefId ? null : defId,
    }));
  };

  // Tapping a piece on the board
  const handlePieceClick = (piece: BoardPiece) => {
    if (gameState.currentTurn !== 'player') return;

    if (gameState.phase === 'move') {
      if (piece.owner === 'player') {
        setGameState(prev => ({
          ...prev,
          selectedPieceId: piece.id,
          selectedBenchDefId: null,
        }));
      }
    } else if (gameState.phase === 'place') {
      // If 3 pieces on board and player tapped friendly piece with bench piece selected: replace
      const playerPieces = gameState.boardPieces.filter(p => p.owner === 'player');
      if (playerPieces.length >= 3 && gameState.selectedBenchDefId && piece.owner === 'player') {
        // Replace this piece with bench piece
        const def = PIECES[gameState.selectedBenchDefId];
        if (!def) return;

        sound.playPiecePlace();
        const replacedPieces = gameState.boardPieces.filter(p => p.id !== piece.id);
        const newPiece: BoardPiece = {
          id: `piece-player-${Date.now()}`,
          defId: def.id,
          owner: 'player',
          r: piece.r,
          c: piece.c,
          hasMovedThisTurn: false,
          turnsOnBoard: 0,
        };

        setGameState(prev => ({
          ...prev,
          boardPieces: [...replacedPieces, newPiece],
          playerPlayedDefIds: [...prev.playerPlayedDefIds, def.id],
          selectedBenchDefId: null,
          phase: 'move',
          selectedPieceId: newPiece.id,
        }));
      }
    }
  };

  // Tapping a tile to place or inspect
  const handleTileClick = (r: number, c: number) => {
    if (gameState.currentTurn !== 'player') return;

    if (gameState.phase === 'place' && gameState.selectedBenchDefId) {
      const def = PIECES[gameState.selectedBenchDefId];
      if (!def) return;
      // Rulebook: max 3 on board; at 3 you must tap a friendly piece to replace it, or skip.
      if (gameState.boardPieces.filter(p => p.owner === 'player').length >= 3) return;
      if (def.turnAvailable > gameState.round) return;

      if (
        isStartingPositionValid(
          def,
          r,
          c,
          gameState.boardSize,
          gameState.obstacles,
          gameState.boardPieces
        )
      ) {
        sound.playPiecePlace();
        const newPiece: BoardPiece = {
          id: `piece-player-${Date.now()}`,
          defId: def.id,
          owner: 'player',
          r,
          c,
          hasMovedThisTurn: false,
          turnsOnBoard: 0,
        };

        setGameState(prev => ({
          ...prev,
          boardPieces: [...prev.boardPieces, newPiece],
          playerPlayedDefIds: [...prev.playerPlayedDefIds, def.id],
          selectedBenchDefId: null,
          phase: 'move',
          selectedPieceId: newPiece.id,
        }));
      }
    }
  };

  // Skipping placement when >= 1 piece on board
  const handleSkipPlace = () => {
    setGameState(prev => ({
      ...prev,
      selectedBenchDefId: null,
      phase: 'move',
      selectedPieceId:
        prev.boardPieces.find(p => p.owner === 'player' && !p.hasMovedThisTurn)?.id || null,
    }));
  };

  // Moving a piece along a path
  const executeMove = (pieceId: string, move: LegalMove, onComplete?: () => void) => {
    const piece = gameState.boardPieces.find(p => p.id === pieceId);
    if (!piece) return;

    const isJump = move.isJump;
    if (isJump) {
      sound.playJump();
    } else {
      sound.playMoveStep();
    }

    // Step-by-step path animation
    const fullPath = isJump ? [{ r: move.targetR, c: move.targetC }] : move.path;
    let stepIndex = 0;

    const animateInterval = setInterval(() => {
      if (stepIndex >= fullPath.length) {
        clearInterval(animateInterval);
        setAnimatingPiece(null);

        // Apply Move Effects
        setGameState(prev => {
          let updatedCoins = [...prev.coins];
          let playerGainedSilver = 0;
          let playerGainedGold = 0;
          let opponentGainedSilver = 0;
          let opponentGainedGold = 0;

          // Coins collected
          if (move.coinsCollected && move.coinsCollected.length > 0) {
            const collectedIds = new Set(move.coinsCollected.map(c => c.id));
            updatedCoins = updatedCoins.filter(c => !collectedIds.has(c.id));

            move.coinsCollected.forEach(coin => {
              if (piece.owner === 'player') {
                if (coin.type === 'gold') playerGainedGold += 1;
                else playerGainedSilver += 1;
              } else {
                if (coin.type === 'gold') opponentGainedGold += 1;
                else opponentGainedSilver += 1;
              }
            });

            // Play audio and show popups
            const hasGold = move.coinsCollected.some(c => c.type === 'gold');
            if (hasGold) sound.playGoldCoin();
            else sound.playCoin();

            move.coinsCollected.forEach(c => {
              addScorePopup(
                c.r,
                c.c,
                c.type === 'gold' ? '+3 GOLD' : '+1 SILVER',
                c.type === 'gold' ? '#f59e0b' : '#e2e8f0'
              );
            });
          }

          // Special ability interactions
          let updatedPieces = prev.boardPieces.map(p => {
            if (p.id === pieceId) {
              return {
                ...p,
                r: move.targetR,
                c: move.targetC,
                hasMovedThisTurn: true,
                turnsOnBoard: p.turnsOnBoard + 1,
                moveBonus: p.defId === 'moana' ? p.moveBonus : 0, // buffs are used up (Moana stacks)
              };
            }
            return p;
          });

          // Daisy swap: swaps places with opponent piece
          if (move.specialAction === 'swap') {
            sound.playAbility();
            updatedPieces = updatedPieces.map(p => {
              if (p.r === move.targetR && p.c === move.targetC && p.id !== pieceId) {
                return { ...p, r: piece.r, c: piece.c };
              }
              return p;
            });
          }

          // Scar remove: removes target piece
          if (move.specialAction === 'remove') {
            sound.playAbility();
            updatedPieces = updatedPieces.filter(
              p => !(p.r === move.targetR && p.c === move.targetC && p.id !== pieceId)
            );
          }

          let updatedObstacles = [...prev.obstacles];

          // Flynn post-move ability: leaves silver coin on previous tile!
          if (piece.defId === 'flynn') {
            updatedCoins.push({
              id: `flynn-coin-${Date.now()}`,
              r: piece.r,
              c: piece.c,
              type: 'silver',
              value: 1,
            });
          }

          // Post-move abilities (wall smashing, pushes, Rapunzel, Elsa's ice, Oswald ...)
          const fx = applyMoveEffects({
            moverId: pieceId,
            defId: piece.defId,
            path: fullPath,
            isJump: !!isJump,
            collectedCount: move.coinsCollected?.length || 0,
            pieces: updatedPieces,
            obstacles: updatedObstacles,
            coins: updatedCoins,
            ice: prev.ice || [],
            size: prev.boardSize,
          });
          updatedPieces = fx.pieces;
          updatedObstacles = fx.obstacles;
          updatedCoins = fx.coins;
          if (piece.owner === 'player') { playerGainedGold += fx.gainedGold; playerGainedSilver += fx.gainedSilver; }
          else { opponentGainedGold += fx.gainedGold; opponentGainedSilver += fx.gainedSilver; }
          if (fx.endTurn) updatedPieces = updatedPieces.map(p => (p.owner === piece.owner ? { ...p, hasMovedThisTurn: true } : p));
          if (fx.logs.length) sound.playAbility();

          // Next piece selection
          const nextPiece = updatedPieces.find(
            p => p.owner === prev.currentTurn && !p.hasMovedThisTurn
          );

          return {
            ...prev,
            boardPieces: updatedPieces,
            coins: updatedCoins,
            obstacles: updatedObstacles,
            ice: fx.ice,
            log: [...prev.log, ...fx.logs],
            scores: {
              ...prev.scores,
              player:
                prev.scores.player + playerGainedGold * 3 + playerGainedSilver,
              playerGold: prev.scores.playerGold + playerGainedGold,
              playerSilver: prev.scores.playerSilver + playerGainedSilver,
              opponent:
                prev.scores.opponent + opponentGainedGold * 3 + opponentGainedSilver,
              opponentGold: prev.scores.opponentGold + opponentGainedGold,
              opponentSilver: prev.scores.opponentSilver + opponentGainedSilver,
            },
            selectedPieceId: nextPiece?.id || null,
          };
        });

        if (onComplete) onComplete();
        return;
      }

      const step = fullPath[stepIndex];
      setAnimatingPiece({
        pieceId,
        currentR: step.r,
        currentC: step.c,
      });
      stepIndex++;
    }, 120);
  };

  // Selecting a legal move destination
  const handleMoveSelect = (move: LegalMove) => {
    if (!gameState.selectedPieceId) return;
    executeMove(gameState.selectedPieceId, move);
  };

  // Ending current player's move phase
  const handleEndTurn = () => {
    sound.playMoveStep();
    // Switch to Opponent Turn
    setGameState(prev => ({
      ...endOfTurn(prev, 'player'),
      currentTurn: 'opponent',
      phase: 'place',
      selectedPieceId: null,
      selectedBenchDefId: null,
    }));
  };

  // Auto-end the player's turn once every piece has moved
  useEffect(() => {
    if (gameState.currentTurn !== 'player' || gameState.phase !== 'move' || animatingPiece) return;
    const mine = gameState.boardPieces.filter(p => p.owner === 'player');
    if (mine.length > 0 && mine.every(p => p.hasMovedThisTurn)) {
      const t = setTimeout(handleEndTurn, 500);
      return () => clearTimeout(t);
    }
  }, [gameState.boardPieces, gameState.phase, gameState.currentTurn, animatingPiece]);

  // AI Opponent Loop
  useEffect(() => {
    if (gameState.currentTurn !== 'opponent' || gameState.phase === 'game_over') return;

    const timer = setTimeout(() => {
      if (gameState.phase === 'place') {
        const placement = computeAIPlacement(gameState);
        if (placement && placement.action === 'place' && placement.pieceDefId) {
          const def = PIECES[placement.pieceDefId];
          const newPiece: BoardPiece = {
            id: `piece-opponent-${Date.now()}`,
            defId: def.id,
            owner: 'opponent',
            r: placement.targetR!,
            c: placement.targetC!,
            hasMovedThisTurn: false,
            turnsOnBoard: 0,
          };

          sound.playPiecePlace();
          setGameState(prev => ({
            ...prev,
            boardPieces: [...prev.boardPieces, newPiece],
            opponentPlayedDefIds: [...prev.opponentPlayedDefIds, def.id],
            phase: 'move',
          }));
        } else {
          // Skip place
          setGameState(prev => ({
            ...prev,
            phase: 'move',
          }));
        }
      } else if (gameState.phase === 'move') {
        // AI executes move for one piece at a time
        const aiDecision = computeAIMove(gameState);
        if (aiDecision && aiDecision.action === 'move' && aiDecision.move) {
          executeMove(aiDecision.pieceId!, aiDecision.move);
        } else {
          // Opponent has finished moving all pieces
          setGameState(prev => endOfTurn(prev, 'opponent'));
          // Complete round or start player turn for next round!
          if (gameState.round >= gameState.maxRounds) {
            // Match Finished!
            sound.playVictory();
            setGameState(prev => ({
              ...prev,
              phase: 'game_over',
            }));
          } else {
            // Advance to next round!
            setGameState(prev => {
              // Reset moved status for all pieces
              const resetPieces = prev.boardPieces.map(p => ({
                ...p,
                hasMovedThisTurn: false,
              }));

              // Spawn fresh coins if needed
              let updatedCoins = [...prev.coins];
              if (updatedCoins.length < 5) {
                // Spawn 3 new coins
                for (let k = 0; k < 3; k++) {
                  const r = Math.floor(Math.random() * prev.boardSize);
                  const c = Math.floor(Math.random() * prev.boardSize);
                  if (
                    !isPitTile(r, c, prev.obstacles) &&
                    !isSolidTile(r, c, prev.obstacles) &&
                    !updatedCoins.some(coin => coin.r === r && coin.c === c)
                  ) {
                    const isGold = Math.random() > 0.6;
                    updatedCoins.push({
                      id: `coin-respawn-${Date.now()}-${k}`,
                      r,
                      c,
                      type: isGold ? 'gold' : 'silver',
                      value: isGold ? 3 : 1,
                    });
                  }
                }
              }

              return {
                ...prev,
                round: prev.round + 1,
                ice: [], // ice melts between rounds
                currentTurn: 'player',
                phase: 'place',
                boardPieces: resetPieces,
                coins: updatedCoins,
                selectedPieceId: null,
                selectedBenchDefId: null,
              };
            });
          }
        }
      }
    }, 900);

    return () => clearTimeout(timer);
  }, [gameState.currentTurn, gameState.phase, gameState.boardPieces, gameState.round]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100 flex flex-col">
      {/* 3D ISOMETRIC BOARD STAGE */}
      <div className="relative flex-1 w-full h-full">
        <IsometricBoard
          gameState={gameState}
          assets={assets}
          legalMoves={legalMoves}
          validStartTiles={validStartTiles}
          onTileClick={handleTileClick}
          onPieceClick={handlePieceClick}
          onMoveSelect={handleMoveSelect}
          animatingPiece={animatingPiece}
          floatingScorePopups={scorePopups}
        />

        {/* OVERLAID HUD INTERFACE */}
        <GameHUD
          gameState={gameState}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onRestartMatch={handleRestartMatch}
          onOpenRoster={() => setIsRosterOpen(true)}
          onOpenBoardBuilder={() => setIsBoardEditorOpen(true)}
          onSelectBenchPiece={handleSelectBenchPiece}
          onSkipPlace={handleSkipPlace}
          onEndTurn={handleEndTurn}
        />

      </div>

      {/* 34-PIECE CHARACTER ROSTER MODAL */}
      <RosterModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        selectedBench={playerBench}
        onUpdateBench={newBench => {
          setPlayerBench(newBench);
          setGameState(prev => ({
            ...prev,
            playerBench: newBench,
          }));
        }}
      />

      {/* MODULAR BOARD BUILDER & PRESETS */}
      <BoardEditorModal
        isOpen={isBoardEditorOpen}
        onClose={() => setIsBoardEditorOpen(false)}
        currentPresetId={activePreset.id}
        onSelectPreset={handleSelectPreset}
        onApplyCustomBoard={handleApplyCustomBoard}
      />

      {/* GAME OVER VICTORY / DEFEAT MODAL */}
      <GameOverModal
        isOpen={gameState.phase === 'game_over'}
        scores={gameState.scores}
        onPlayAgain={handleRestartMatch}
        onOpenRoster={() => {
          setGameState(prev => ({ ...prev, phase: 'place' }));
          setIsRosterOpen(true);
        }}
      />
    </div>
  );
}
