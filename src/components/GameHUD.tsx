import React from 'react';
import { BoardPiece, GamePhase, GameScore, GameState, PieceDef, PlayerId } from '../types';
import { PIECES } from '../data/pieces';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Image as ImageIcon,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface GameHUDProps {
  gameState: GameState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRestartMatch: () => void;
  onOpenRoster: () => void;
  onOpenBoardBuilder: () => void;
  onSelectBenchPiece: (defId: string) => void;
  onSelectActivePiece: (piece: BoardPiece) => void;
  onSkipPlace: () => void;
  onEndTurn: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  soundEnabled,
  onToggleSound,
  onRestartMatch,
  onOpenRoster,
  onOpenBoardBuilder,
  onSelectBenchPiece,
  onSelectActivePiece,
  onSkipPlace,
  onEndTurn,
}) => {
  const {
    round,
    maxRounds,
    currentTurn,
    phase,
    scores,
    boardPieces,
    playerBench,
    selectedPieceId,
    selectedBenchDefId,
  } = gameState;

  const isPlayerTurn = currentTurn === 'player';
  const playerPiecesOnBoard = boardPieces.filter(p => p.owner === 'player');
  const allPlayerMoved = playerPiecesOnBoard.every(p => p.hasMovedThisTurn);

  // Selected piece info
  const selectedPiece = boardPieces.find(p => p.id === selectedPieceId);
  const selectedPieceDef = selectedPiece ? PIECES[selectedPiece.defId] : null;
  const selectedBenchDef = selectedBenchDefId ? PIECES[selectedBenchDefId] : null;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-40">
      {/* TOP STATUS BAR */}
      <div className="w-full bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 pointer-events-auto px-3 py-2 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* PLAYER SCORE */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-black text-sm">
              P1
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Player</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-blue-400">{scores.player}</span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  ({scores.playerGold}G / {scores.playerSilver}S)
                </span>
              </div>
            </div>
          </div>

          {/* ROUND & TURN TRACKER */}
          <div className="flex flex-col items-center">
            <div className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">
              Round {round} / {maxRounds}
            </div>
            <div className="mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors shadow-xs flex items-center gap-1.5">
              {isPlayerTurn ? (
                phase === 'place' ? (
                  <span className="text-emerald-400 bg-emerald-950/60 border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Your Turn: Place
                  </span>
                ) : (
                  <span className="text-blue-400 bg-blue-950/60 border-blue-500/40 px-2 py-0.5 rounded-full">
                    Your Turn: Move
                  </span>
                )
              ) : (
                <span className="text-rose-400 bg-rose-950/60 border-rose-500/40 px-2 py-0.5 rounded-full animate-pulse">
                  AI Opponent Thinking...
                </span>
              )}
            </div>
          </div>

          {/* OPPONENT SCORE & ACTIONS */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Opponent</div>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-xl font-black text-rose-400">{scores.opponent}</span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  ({scores.opponentGold}G / {scores.opponentSilver}S)
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 font-black text-sm">
              AI
            </div>
          </div>
        </div>

        {/* QUICK MENU BUTTONS ROW */}
        <div className="max-w-4xl mx-auto mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRoster}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>34 Figurines</span>
            </button>
            <button
              onClick={onOpenBoardBuilder}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Boards</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleSound}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <button
              onClick={onRestartMatch}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
              title="Restart Match"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION TRAY */}
      <div className="w-full bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800 pointer-events-auto p-3 shadow-2xl">
        <div className="max-w-2xl mx-auto space-y-2.5">
          {/* PHASE 1: PLACE PHASE TRAY */}
          {isPlayerTurn && phase === 'place' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Select Figurine to Deploy ({playerPiecesOnBoard.length}/3 on board)
                </div>
                {playerPiecesOnBoard.length > 0 && (
                  <button
                    onClick={onSkipPlace}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold border border-zinc-700 cursor-pointer"
                  >
                    Skip Placement
                  </button>
                )}
              </div>

              {/* Bench Cards */}
              <div className="grid grid-cols-5 gap-2">
                {playerBench.map(defId => {
                  const def = PIECES[defId];
                  if (!def) return null;
                  const isUnlocked = def.turnAvailable <= round;
                  const isSelected = selectedBenchDefId === defId;
                  const alreadyOnBoard = playerPiecesOnBoard.some(p => p.defId === defId);

                  return (
                    <button
                      key={`bench-${defId}`}
                      disabled={!isUnlocked || alreadyOnBoard}
                      onClick={() => onSelectBenchPiece(defId)}
                      className={`relative flex flex-col items-center p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        alreadyOnBoard
                          ? 'opacity-40 border-zinc-800 bg-zinc-900 cursor-not-allowed'
                          : !isUnlocked
                            ? 'opacity-50 border-zinc-800 bg-zinc-900/60 cursor-not-allowed'
                            : isSelected
                              ? 'border-emerald-400 bg-emerald-950/40 ring-2 ring-emerald-400/50 scale-102'
                              : 'border-zinc-700/80 bg-zinc-900/90 hover:border-zinc-500'
                      }`}
                    >
                      {/* Character Monogram / Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-md border border-white/20 mb-1"
                        style={{ backgroundColor: def.avatarUrl ? "transparent" : def.accentColor }}
                      >
                        {def.avatarUrl ? <img src={def.avatarUrl} alt="" className="h-9 w-auto object-contain" /> : def.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="text-[11px] font-bold text-zinc-200 truncate w-full text-center">
                        {def.name}
                      </div>

                      <div className="text-[9px] text-zinc-400 font-medium">
                        {def.startPosition}
                      </div>

                      {/* Lock badge if turn not reached */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-[10px] font-black text-amber-400 backdrop-blur-2xs">
                          Turn {def.turnAvailable}
                        </div>
                      )}

                      {alreadyOnBoard && (
                        <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-[10px] font-bold text-zinc-300">
                          Active
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Bench Info Helper */}
              {selectedBenchDef && (
                <div className="mt-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-400">{selectedBenchDef.name}</span>: Starts on{' '}
                    <span className="font-semibold text-zinc-200">{selectedBenchDef.startPosition}</span>. Tap glowing tile above!
                  </div>
                  <div className="text-[11px] text-zinc-400 italic">{selectedBenchDef.movementDesc}</div>
                </div>
              )}
            </div>
          )}

          {/* PHASE 2: MOVE PHASE TRAY */}
          {isPlayerTurn && phase === 'move' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs font-bold text-zinc-300">
                  Select and Move Figurines ({playerPiecesOnBoard.filter(p => p.hasMovedThisTurn).length}/{playerPiecesOnBoard.length} moved)
                </div>
                {allPlayerMoved ? (
                  <button
                    onClick={onEndTurn}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 cursor-pointer animate-pulse"
                  >
                    End Turn
                  </button>
                ) : (
                  <button
                    onClick={onEndTurn}
                    className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-semibold border border-zinc-700 cursor-pointer"
                  >
                    Pass Remaining
                  </button>
                )}
              </div>

              {/* Active Pieces List */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {playerPiecesOnBoard.map(piece => {
                  const def = PIECES[piece.defId];
                  if (!def) return null;
                  const isSelected = selectedPieceId === piece.id;

                  return (
                    <button
                      key={`active-${piece.id}`}
                      disabled={piece.hasMovedThisTurn}
                      onClick={() => onSelectActivePiece(piece)}
                      className={`flex-1 min-w-[120px] p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                        piece.hasMovedThisTurn
                          ? 'opacity-40 border-zinc-800 bg-zinc-900/60 cursor-default'
                          : isSelected
                            ? 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/40'
                            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: def.avatarUrl ? "transparent" : def.accentColor }}
                      >
                        {def.avatarUrl ? <img src={def.avatarUrl} alt="" className="h-7 w-auto object-contain" /> : def.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="text-xs font-bold text-zinc-200 truncate">{def.name}</div>
                        <div className="text-[10px] text-zinc-400">
                          {piece.hasMovedThisTurn ? 'Done' : 'Ready'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Movement / Ability Details Card */}
              {selectedPieceDef && !selectedPiece?.hasMovedThisTurn && (
                <div className="mt-2 p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs">
                  <div className="flex items-center justify-between font-bold text-amber-400 mb-0.5">
                    <span>{selectedPieceDef.name}</span>
                    <span className="text-[10px] text-zinc-400">Tap amber diamond to move</span>
                  </div>
                  <div className="text-zinc-300 text-[11px] leading-relaxed">
                    <span className="font-semibold text-zinc-100">Move:</span> {selectedPieceDef.movementDesc}
                  </div>
                  {selectedPieceDef.ability !== 'None' && (
                    <div className="text-amber-300 text-[11px] mt-0.5">
                      <span className="font-semibold text-amber-200">★ Ability:</span> {selectedPieceDef.ability}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OPPONENT TURN WAIT MESSAGE */}
          {!isPlayerTurn && (
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-medium text-zinc-300">
                Opponent is planning strategy and moving figurines...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
