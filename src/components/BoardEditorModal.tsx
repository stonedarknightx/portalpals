import React, { useState } from 'react';
import { BoardPreset, Obstacle, ObstacleType } from '../types';
import { BOARD_PRESETS } from '../data/pieces';
import { X, Check, Plus, Trash2, Shield, Sparkles, Layers } from 'lucide-react';

interface BoardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPresetId: string;
  onSelectPreset: (preset: BoardPreset) => void;
  onApplyCustomBoard: (size: number, obstacles: Obstacle[]) => void;
}

export const BoardEditorModal: React.FC<BoardEditorModalProps> = ({
  isOpen,
  onClose,
  currentPresetId,
  onSelectPreset,
  onApplyCustomBoard,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'editor'>('presets');
  const customSize = 8; // fixed 8x8 board
  const [customObstacles, setCustomObstacles] = useState<Obstacle[]>([
    { id: 'custom-pit', type: 'pit', r: 3, c: 3, sizeR: 2, sizeC: 2 },
    { id: 'custom-wall', type: 'wall', r: 1, c: 1 },
    { id: 'custom-crys', type: 'crystal', r: 5, c: 5 },
  ]);
  const [selectedTool, setSelectedTool] = useState<ObstacleType | 'erase'>('pit');

  if (!isOpen) return null;

  const handleCellClick = (r: number, c: number) => {
    if (selectedTool === 'erase') {
      // remove any obstacle covering this cell
      setCustomObstacles(prev =>
        prev.filter(o => {
          if (o.type === 'pit') {
            const szR = o.sizeR || 2;
            const szC = o.sizeC || 2;
            return !(r >= o.r && r < o.r + szR && c >= o.c && c < o.c + szC);
          }
          return !(o.r === r && o.c === c);
        })
      );
      return;
    }

    if (selectedTool === 'pit') {
      // Pit needs 2x2 space
      if (r + 1 >= customSize || c + 1 >= customSize) return;
      // remove any obstacles conflicting
      const newObs: Obstacle = {
        id: `pit-${Date.now()}`,
        type: 'pit',
        r,
        c,
        sizeR: 2,
        sizeC: 2,
      };
      setCustomObstacles(prev => [
        ...prev.filter(o => !(o.r >= r && o.r <= r + 1 && o.c >= c && o.c <= c + 1)),
        newObs,
      ]);
    } else {
      const newObs: Obstacle = {
        id: `${selectedTool}-${Date.now()}`,
        type: selectedTool,
        r,
        c,
      };
      setCustomObstacles(prev => [
        ...prev.filter(o => !(o.r === r && o.c === c)),
        newObs,
      ]);
    }
  };

  const isPit = (r: number, c: number) => {
    return customObstacles.some(o => {
      if (o.type !== 'pit') return false;
      const szR = o.sizeR || 2;
      const szC = o.sizeC || 2;
      return r >= o.r && r < o.r + szR && c >= o.c && c < o.c + szC;
    });
  };

  const getObstacleAt = (r: number, c: number) => {
    return customObstacles.find(o => o.r === r && o.c === c);
  };

  const handleApplyCustom = () => {
    onApplyCustomBoard(customSize, customObstacles);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* HEADER */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Board Configuration
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose an official board setup or build your own modular custom board
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Official Presets
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-zinc-800 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Custom Board Builder
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {activeTab === 'presets' ? (
            <div className="space-y-3">
              {BOARD_PRESETS.map(preset => {
                const isSelected = currentPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onSelectPreset(preset as BoardPreset);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/30 ring-2 ring-blue-500/30'
                        : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{preset.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            preset.difficulty === 'Beginner'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : preset.difficulty === 'Intermediate'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {preset.difficulty} ({preset.size}x{preset.size})
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{preset.description}</p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-500 text-black flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* SIZE & TOOLS */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400 font-semibold">8x8 board</span>

                {/* Obstacle stamp tools */}
                <div className="flex items-center gap-1 p-1 bg-zinc-800 rounded-xl text-xs">
                  <button
                    onClick={() => setSelectedTool('pit')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedTool === 'pit'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    2x2 Pit
                  </button>
                  <button
                    onClick={() => setSelectedTool('wall')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedTool === 'wall'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    L-Wall
                  </button>
                  <button
                    onClick={() => setSelectedTool('crystal')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedTool === 'crystal'
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Crystal
                  </button>
                  <button
                    onClick={() => setSelectedTool('erase')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                      selectedTool === 'erase'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Erase
                  </button>
                </div>
              </div>

              {/* INTERACTIVE 2D STAMP GRID */}
              <div className="flex justify-center p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
                <div
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${customSize}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: customSize * customSize }).map((_, idx) => {
                    const r = Math.floor(idx / customSize);
                    const c = idx % customSize;
                    const pitCovered = isPit(r, c);
                    const obs = getObstacleAt(r, c);

                    return (
                      <button
                        key={`cell-${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        className={`w-11 h-11 rounded-lg border flex items-center justify-center text-[10px] font-black transition-all cursor-pointer ${
                          pitCovered
                            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                            : obs?.type === 'wall'
                              ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                              : obs?.type === 'crystal'
                                ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                                : (r + c) % 2 === 0
                                  ? 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                        }`}
                      >
                        {pitCovered
                          ? 'PIT'
                          : obs?.type === 'wall'
                            ? 'WALL'
                            : obs?.type === 'crystal'
                              ? 'CRYS'
                              : ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 text-center">
                Tap on grid cells to stamp obstacles or erase them.
              </div>

              <button
                onClick={handleApplyCustom}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Apply Custom Board to Match
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
