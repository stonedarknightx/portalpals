import React, { useState } from 'react';
import { PieceDef } from '../types';
import { PIECES, JUMPER_IDS, WALL_BREAKER_IDS, PASS_PIECE_IDS, randomBench } from '../data/pieces';
import { toast } from '../utils/toast';
import { X, Search, Check, Sparkles, Compass, Shield, Shuffle, Mountain } from 'lucide-react';

// What each figurine source means (shown under the filter tabs)
const SOURCE_INFO: Record<string, string> = {
  All: 'Every figurine in the game. Tap one to read its backstory and see its full stats.',
  Auto: 'Starter figurines: yours from the very beginning, with no unlocking needed.',
  Ranking: 'Unlocked by earning Ranking Points as you win and play matches.',
  Crafting: 'Unlocked through the crafting system instead of the ranking track. Special pieces you build rather than win.',
};

// Terrain behaviour shown on cards (mirrors utils/movement.ts)
function terrainInfo(id: string) {
  const crosses = JUMPER_IDS.includes(id)
    ? 'Jumps over walls, crystals, pits and pieces'
    : id === 'stitch'
    ? 'Tunnels through walls; blocked by crystals, pits and pieces'
    : PASS_PIECE_IDS.includes(id)
    ? 'Passes through pieces; blocked by walls, crystals and pits'
    : 'Blocked by walls, crystals, pits and pieces';
  const breaks = WALL_BREAKER_IDS.includes(id) ? 'Can destroy stone walls' : 'Cannot destroy walls';
  return { crosses, breaks };
}

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBench: string[];
  onUpdateBench: (bench: string[]) => void;
}

export const RosterModal: React.FC<RosterModalProps> = ({
  isOpen,
  onClose,
  selectedBench,
  onUpdateBench,
}) => {
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<'All' | 'Auto' | 'Ranking' | 'Crafting'>('All');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tab, setTab] = useState<'all' | 'bench'>('all');

  if (!isOpen) return null;

  const pieceList = Object.values(PIECES);

  const filteredPieces = pieceList.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.ability.toLowerCase().includes(search.toLowerCase()) ||
      (p.theme || '').toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === 'All' || p.received === filterSource;
    return matchesSearch && matchesSource;
  });

  const activeDef = detailId ? PIECES[detailId] : null;
  const isInBench = !!activeDef && selectedBench.includes(activeDef.id);

  const toggleBench = (defId: string) => {
    const name = PIECES[defId]?.name || 'Figurine';
    if (selectedBench.includes(defId)) {
      if (selectedBench.length <= 1) {
        toast('Your bench needs at least one figurine.', 'warn');
        return;
      }
      onUpdateBench(selectedBench.filter(id => id !== defId));
      toast(`${name} removed from your bench.`, 'info');
    } else {
      if (selectedBench.length >= 5) {
        const dropped = PIECES[selectedBench[0]]?.name || 'your oldest pick';
        onUpdateBench([...selectedBench.slice(1), defId]);
        toast(`Bench full: ${name} replaced ${dropped}.`, 'warn');
      } else {
        onUpdateBench([...selectedBench, defId]);
        toast(`${name} added to your bench (${selectedBench.length + 1}/5).`, 'success');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Portal Pals Roster (34 Figurines)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tap a figurine for details and to add it to your match bench ({selectedBench.length}/5 selected)
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
        <div className="px-4 pt-2 border-b border-zinc-800 flex gap-1 text-sm">
          {([['all', `All Figurines (${Object.keys(PIECES).length})`], ['bench', `My Bench (${selectedBench.length}/5)`]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-t-lg font-bold cursor-pointer transition-colors ${
                tab === k ? 'bg-zinc-800 text-amber-300 border-b-2 border-amber-400' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'bench' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p className="text-xs text-zinc-400 max-w-md">
                Your bench is picked at random. Reshuffle for a fresh five, or swap figurines in from the All Figurines tab.
              </p>
              <button
                onClick={() => { onUpdateBench(randomBench()); toast('Bench shuffled: here are your 5 new figurines!', 'ability'); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-black cursor-pointer"
              >
                <Shuffle className="w-4 h-4" /> Shuffle Bench
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, i) => {
                const def = PIECES[selectedBench[i]];
                if (!def) {
                  return (
                    <button
                      key={`empty-${i}`}
                      onClick={() => setTab('all')}
                      className="min-h-[200px] rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-500 text-sm hover:border-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      Empty slot {i + 1}<br />Tap to choose a figurine
                    </button>
                  );
                }
                const t = terrainInfo(def.id);
                return (
                  <div key={def.id} className="rounded-2xl bg-zinc-950 border border-zinc-700 overflow-hidden flex flex-col">
                    <div
                      className="h-52 flex items-end justify-center"
                      style={{ background: `radial-gradient(circle at 50% 75%, ${def.accentColor}66, #09090b 75%)` }}
                    >
                      {def.avatarUrl && <img src={def.avatarUrl} alt={def.name} className="h-48 w-auto object-contain mb-1" />}
                    </div>
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-white text-lg">{def.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">{def.theme}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug line-clamp-3">{def.description}</p>
                      <div className="text-[11px] text-zinc-300"><b className="text-amber-300">Plays:</b> turn {def.turnAvailable} · <b className="text-sky-300">Starts:</b> {def.startPosition}</div>
                      <div className="text-[11px] text-zinc-300"><b className="text-emerald-300">Move:</b> {def.movementDesc}</div>
                      <div className="text-[11px] text-zinc-300"><b className="text-amber-300">Ability:</b> {def.ability}</div>
                      <div className="text-[11px] text-zinc-300"><b className="text-violet-300">Terrain:</b> {t.crosses}. {t.breaks}.</div>
                      <div className="flex gap-2 mt-auto pt-2">
                        <button onClick={() => setDetailId(def.id)} className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 cursor-pointer">Details</button>
                        <button onClick={() => toggleBench(def.id)} className="flex-1 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-xs font-bold text-rose-300 border border-rose-800 cursor-pointer">Remove</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS */}
        {tab === 'all' && (
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pieces, abilities..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Source filters */}
          <div className="flex items-center gap-1 p-1 bg-zinc-800 rounded-xl text-xs">
            {(['All', 'Auto', 'Ranking', 'Crafting'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterSource(tab)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterSource === tab
                    ? 'bg-amber-500 text-black font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}{tab !== 'All' ? ` (${pieceList.filter(p => p.received === tab).length})` : ''}
              </button>
            ))}
          </div>
          <p className="w-full text-[11px] text-zinc-400 leading-snug">{SOURCE_INFO[filterSource]}</p>
        </div>

        )}

        {/* MAIN BODY */}
        {tab === 'all' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT: CHARACTER GRID */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredPieces.map(piece => {
              const inBench = selectedBench.includes(piece.id);
              const isSelected = detailId === piece.id;

              return (
                <div
                  key={piece.id}
                  onClick={() => setDetailId(piece.id)}
                  className={`relative p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/30'
                      : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Active Squad Tag */}
                  {inBench && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-[9px] font-black text-black flex items-center gap-1 shadow-xs">
                      <Check className="w-2.5 h-2.5" />
                      BENCH
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-14 h-14 rounded-xl flex items-end justify-center font-black text-xs text-white shrink-0 overflow-hidden"
                        style={{ background: `radial-gradient(circle at 50% 70%, ${piece.accentColor}55, #18181b)` }}
                      >
                        {piece.avatarUrl ? (
                          <img src={piece.avatarUrl} alt={piece.name} className="h-full w-auto object-contain" loading="lazy" />
                        ) : (
                          <span className="self-center">{piece.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-zinc-100 truncate">{piece.name}</div>
                        <div className="text-[10px] text-zinc-400">{piece.theme} · {piece.startPosition}</div>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-amber-300 border border-zinc-700/80 shrink-0">
                      Turn {piece.turnAvailable}
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-zinc-400 line-clamp-2">
                    {piece.ability === 'None' ? piece.movementDesc : `★ ${piece.ability}`}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        )}
      </div>

      {/* FIGURINE DETAIL POP-UP */}
      {activeDef && (
        <div
          className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDetailId(null)}
        >
          <div
            className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setDetailId(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/70 text-zinc-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div
              className="h-48 flex items-end justify-center rounded-t-2xl overflow-hidden"
              style={{ background: `radial-gradient(circle at 50% 75%, ${activeDef.accentColor}66, #09090b 75%)` }}
            >
              {activeDef.avatarUrl ? (
                <img src={activeDef.avatarUrl} alt={activeDef.name} className="h-44 w-auto object-contain drop-shadow-xl mb-1" />
              ) : (
                <div className="self-center text-6xl font-black text-white/80">{activeDef.name.slice(0, 2).toUpperCase()}</div>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div>
                <h3 className="text-xl font-black text-white">{activeDef.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                  {activeDef.theme && <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">{activeDef.theme}</span>}
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 border border-zinc-700">Playable turn {activeDef.turnAvailable}</span>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-sky-300 border border-zinc-700">Unlocked by: {activeDef.received}</span>
                </div>
              </div>

              {activeDef.description && (
                <p className="text-xs text-zinc-300 leading-relaxed"><span className="font-bold text-amber-300">Backstory: </span>{activeDef.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" /> Movement
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 leading-snug">{activeDef.movementDesc}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-blue-400" /> Starts On
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 leading-snug">{activeDef.startPosition} tiles</div>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] uppercase font-bold text-amber-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Special Ability
                </div>
                <div className="text-xs font-semibold text-zinc-200 leading-relaxed">{activeDef.ability}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-[10px] uppercase font-bold text-violet-400 mb-1 flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5" /> Terrain
                </div>
                <div className="text-xs font-semibold text-zinc-200 leading-relaxed">
                  Never lands on walls, crystals or pits. {terrainInfo(activeDef.id).crosses}. {terrainInfo(activeDef.id).breaks}.
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 text-center">
                Bench: {selectedBench.length}/5{!isInBench && selectedBench.length >= 5 ? ' (full: adding replaces your oldest pick)' : ''}
              </div>
              <button
                onClick={() => toggleBench(activeDef.id)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                  isInBench
                    ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-600/30 font-black'
                }`}
              >
                {isInBench ? 'Remove from Bench' : 'Add to Bench'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
