import React from 'react';
import { GameScore } from '../types';
import { Trophy, Award, RotateCcw, BookOpen, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  scores: GameScore;
  onPlayAgain: () => void;
  onOpenRoster: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  scores,
  onPlayAgain,
  onOpenRoster,
}) => {
  if (!isOpen) return null;

  const playerWon = scores.player > scores.opponent;
  const isDraw = scores.player === scores.opponent;
  const rankingPoints = playerWon ? 45 : isDraw ? 20 : 10;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center shadow-2xl overflow-hidden">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 ${
            playerWon ? 'bg-amber-400' : isDraw ? 'bg-blue-400' : 'bg-rose-500'
          }`}
        />

        {/* Icon & Title */}
        <div className="relative mb-4 flex flex-col items-center">
          <div
            className={`w-18 h-18 rounded-2xl flex items-center justify-center shadow-xl border-2 mb-3 ${
              playerWon
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : isDraw
                  ? 'bg-blue-500/20 border-blue-400 text-blue-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
            }`}
          >
            <Trophy className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            {playerWon ? 'VICTORY!' : isDraw ? 'DRAW MATCH!' : 'DEFEAT'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {playerWon
              ? 'Outstanding maneuvering! You collected more coins over 5 rounds.'
              : isDraw
                ? 'An evenly matched tactical duel across 5 rounds.'
                : 'The opponent claimed more coins this time. Ready for a rematch?'}
          </p>
        </div>

        {/* Score comparison card */}
        <div className="relative p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 mb-5">
          <div className="grid grid-cols-2 gap-4 divide-x divide-zinc-800">
            <div>
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Your Score</div>
              <div className="text-3xl font-black text-white mt-0.5">{scores.player}</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                {scores.playerGold} Gold · {scores.playerSilver} Silver
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Opponent</div>
              <div className="text-3xl font-black text-white mt-0.5">{scores.opponent}</div>
              <div className="text-[11px] text-zinc-400 mt-1">
                {scores.opponentGold} Gold · {scores.opponentSilver} Silver
              </div>
            </div>
          </div>

          {/* Ranking rewards */}
          <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              Ranking Points Earned:
            </span>
            <span className="font-black text-amber-400 text-sm">+{rankingPoints} RP</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <button
            onClick={onPlayAgain}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Rematch
          </button>
          <button
            onClick={onOpenRoster}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-zinc-400" />
            Adjust 5-Piece Squad
          </button>
        </div>
      </div>
    </div>
  );
};
