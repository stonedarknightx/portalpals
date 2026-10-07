import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  BoardPiece,
  Coin,
  GameState,
  LegalMove,
  Obstacle,
} from '../types';
import { PIECES } from '../data/pieces';
import {
  DEFAULT_TILE_WIDTH,
  DEFAULT_TILE_HEIGHT,
  TILE_IMAGE_HEIGHT_RATIO,
  PIT_IMAGE_HEIGHT_RATIO,
  gridToIso,
  getIsoDepth,
} from '../utils/isometric';
import { AssetMap } from '../utils/assets';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface IsometricBoardProps {
  gameState: GameState;
  assets: AssetMap;
  legalMoves: LegalMove[];
  validStartTiles: { r: number; c: number }[];
  onTileClick: (r: number, c: number) => void;
  onPieceClick: (piece: BoardPiece) => void;
  onMoveSelect: (move: LegalMove) => void;
  animatingPiece: { pieceId: string; currentR: number; currentC: number } | null;
  floatingScorePopups: { id: string; r: number; c: number; text: string; color: string }[];
}

export const IsometricBoard: React.FC<IsometricBoardProps> = ({
  gameState,
  assets,
  legalMoves,
  validStartTiles,
  onTileClick,
  onPieceClick,
  onMoveSelect,
  animatingPiece,
  floatingScorePopups,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<{ r: number; c: number } | null>(null);

  // Auto-adjust scale based on board size and screen width (fixed 8x8)
  useEffect(() => {
    const updateDefaultZoom = () => {
      const width = window.innerWidth;
      if (width < 450) {
        setZoom(0.68);
      } else if (width < 768) {
        setZoom(0.85);
      } else {
        setZoom(1.0);
      }
      setPan({ x: 0, y: -20 });
    };

    updateDefaultZoom();
    window.addEventListener('resize', updateDefaultZoom);
    return () => window.removeEventListener('resize', updateDefaultZoom);
  }, [gameState.boardSize]);

  // Touch and Mouse Drag handlers for pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(1.8, z + 0.15));
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.15));
  const handleResetView = () => {
    const width = window.innerWidth;
    setZoom(width < 450 ? 0.68 : 0.95);
    setPan({ x: 0, y: -20 });
  };

  // Map of legal move targets
  const legalMoveMap = useMemo(() => {
    const map = new Map<string, LegalMove>();
    legalMoves.forEach(m => {
      map.set(`${m.targetR},${m.targetC}`, m);
    });
    return map;
  }, [legalMoves]);

  const validStartMap = useMemo(() => {
    const set = new Set<string>();
    validStartTiles.forEach(t => set.add(`${t.r},${t.c}`));
    return set;
  }, [validStartTiles]);

  // Board dimensions
  const { boardSize, obstacles, coins, boardPieces, selectedPieceId } = gameState;

  // Filter obstacles
  const pits = useMemo(() => obstacles.filter(o => o.type === 'pit' && !o.destroyed), [obstacles]);
  const walls = useMemo(() => obstacles.filter(o => o.type === 'wall' && !o.destroyed), [obstacles]);
  const crystals = useMemo(() => obstacles.filter(o => o.type === 'crystal' && !o.destroyed), [obstacles]);

  // Build grid tiles sorted by (r + c) for strict back-to-front painter's order
  const tiles = useMemo(() => {
    const arr: { r: number; c: number; isLight: boolean }[] = [];
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        arr.push({
          r,
          c,
          isLight: (r + c) % 2 === 0,
        });
      }
    }
    // Sort so back tiles render first, ensuring seamless edge overlap
    arr.sort((a, b) => (a.r + a.c) - (b.r + b.c));
    return arr;
  }, [boardSize]);

  // Exact tile dimensions
  const tileWidth = DEFAULT_TILE_WIDTH;
  const tileHeight = DEFAULT_TILE_HEIGHT;
  const tileImageHeight = Math.round(tileWidth * TILE_IMAGE_HEIGHT_RATIO);

  // Render a piece figure
  const renderPieceFigure = useCallback((piece: BoardPiece, isSelected: boolean) => {
    const def = PIECES[piece.defId];
    if (!def) return null;

    const isPlayer = piece.owner === 'player';
    const spriteUrl = def.avatarUrl || null;

    // When NOT selected: shrink up into a compact token without blocking name card
    if (!isSelected) {
      return (
        <div
          className={`relative flex items-center justify-center transition-transform duration-200 hover:scale-115 ${
            piece.hasMovedThisTurn ? 'opacity-65' : 'opacity-100'
          }`}
        >
          {/* Subtle base shadow */}
          <div className="absolute -bottom-1 w-6 h-3 bg-black/50 rounded-full blur-2xs pointer-events-none" />

          {/* Compact Mini Token */}
          <div
            className={`relative w-7 h-7 rounded-xl flex items-center justify-center shadow-md border transition-all ${
              isPlayer
                ? 'bg-blue-600/95 border-blue-300 text-blue-100 shadow-blue-900/50'
                : 'bg-rose-700/95 border-rose-300 text-rose-100 shadow-rose-950/50'
            }`}
            style={{
              backgroundColor: isPlayer ? '#1e3a8a' : '#881337',
              borderColor: def.accentColor,
            }}
          >
            {spriteUrl ? (
              <img
                src={spriteUrl}
                alt={def.name}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-12 w-auto max-w-none object-contain select-none pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <span
                className="text-[9px] font-black tracking-tighter select-none pointer-events-none"
                style={{ color: '#fff' }}
              >
                {def.name.slice(0, 2).toUpperCase()}
              </span>
            )}

            {/* Turn status pip */}
            {piece.hasMovedThisTurn && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-zinc-600 border border-zinc-900 rounded-full flex items-center justify-center text-[6px] font-bold text-zinc-200 pointer-events-none">
                ✓
              </div>
            )}

            {/* Special ability star pip */}
            {def.ability !== 'None' && (
              <div
                className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] font-bold text-black border border-white/60 pointer-events-none"
                style={{ backgroundColor: def.accentColor }}
                title={def.ability}
              >
                ★
              </div>
            )}
          </div>
        </div>
      );
    }

    // When SELECTED: expanded elevated figurine with ring glow, details and name badge
    return (
      <div
        className={`relative flex flex-col items-center justify-center transition-transform duration-200 scale-110 -translate-y-2 ${
          piece.hasMovedThisTurn ? 'opacity-70' : 'opacity-100'
        }`}
      >
        {/* Glow pedestal */}
        <div
          className={`absolute bottom-0 w-12 h-6 rounded-full blur-xs transition-opacity ${
            isPlayer ? 'bg-blue-500/60' : 'bg-rose-500/60'
          } opacity-100 scale-125`}
        />

        {/* 3D Base Token Disc */}
        <div
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all ${
            isPlayer
              ? 'bg-blue-600 border-amber-300 ring-4 ring-amber-400/50 shadow-blue-500/60'
              : 'bg-rose-700 border-amber-300 ring-4 ring-amber-400/50 shadow-rose-500/60'
          }`}
          style={{
            background: isPlayer
              ? 'linear-gradient(145deg, #1e3a8a, #0f172a)'
              : 'linear-gradient(145deg, #881337, #1c0a0a)',
          }}
        >
          {spriteUrl ? (
            <img
              src={spriteUrl}
              alt={def.name}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-16 w-auto max-w-none object-contain drop-shadow-md select-none pointer-events-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center leading-none">
              <span
                className="text-xs font-black tracking-tighter"
                style={{ color: def.accentColor }}
              >
                {def.name.slice(0, 3).toUpperCase()}
              </span>
              <span className="text-[8px] font-bold text-zinc-300 scale-90">
                {isPlayer ? 'P1' : 'AI'}
              </span>
            </div>
          )}

          {/* Turn status pip */}
          {piece.hasMovedThisTurn && (
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-zinc-600 border border-zinc-900 rounded-full flex items-center justify-center text-[8px] font-bold text-zinc-300 pointer-events-none">
              ✓
            </div>
          )}

          {/* Special ability mini badge */}
          {def.ability !== 'None' && (
            <div
              className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-black border border-white/60 shadow-xs pointer-events-none"
              style={{ backgroundColor: def.accentColor }}
              title={def.ability}
            >
              ★
            </div>
          )}
        </div>

        {/* Piece Name Tag (Only rendered when selected so unselected pieces don't block tiles) */}
        <div className="mt-1 px-1.5 py-0.2 rounded-md bg-zinc-950/90 backdrop-blur-xs border border-amber-400/70 text-[9px] font-bold text-amber-200 whitespace-nowrap shadow-md pointer-events-none">
          {def.name}
        </div>
      </div>
    );
  }, [assets]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative w-full h-full min-h-[420px] bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden select-none cursor-grab active:cursor-grabbing flex items-center justify-center touch-none"
    >
      {/* Subtle Atmospheric Vignette & Grid Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-950/15 via-zinc-950/50 to-zinc-950 pointer-events-none" />

      {/* Floating Viewport Controls */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 p-1 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-zinc-700/60 shadow-lg">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Center Board"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Isometric Stage Container */}
      <div
        className="relative transition-transform duration-75 origin-center ease-out pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: boardSize * tileWidth,
          height: boardSize * tileHeight * 2,
        }}
      >
        {/* Centered board anchor */}
        <div
          className="absolute"
          style={{
            left: `${(boardSize * tileWidth) / 2}px`,
            top: `${(boardSize * tileHeight) / 2 + 30}px`,
          }}
        >
          {/* LAYER 0: SEAMLESS BASE TILES (8x8 CHECKERBOARD) */}
          {tiles.map(tile => {
            const { r, c, isLight } = tile;
            const iso = gridToIso(r, c, tileWidth, tileHeight);
            const tileKey = `${r},${c}`;
            const isLegalMove = legalMoveMap.has(tileKey);
            const isValidStart = validStartMap.has(tileKey);
            const isHovered = hoveredTile?.r === r && hoveredTile?.c === c;
            const legalMoveData = legalMoveMap.get(tileKey);

            return (
              <div
                key={`tile-${tileKey}`}
                onClick={e => {
                  e.stopPropagation();
                  if (isLegalMove && legalMoveData) {
                    onMoveSelect(legalMoveData);
                  } else {
                    onTileClick(r, c);
                  }
                }}
                onMouseEnter={() => setHoveredTile({ r, c })}
                onMouseLeave={() => setHoveredTile(null)}
                style={{
                  left: `${iso.x - tileWidth / 2}px`,
                  top: `${iso.y - tileHeight / 2}px`,
                  width: `${tileWidth}px`,
                  height: `${tileImageHeight}px`,
                  zIndex: getIsoDepth(r, c, 0),
                }}
                className="absolute cursor-pointer group m-0 p-0 overflow-visible"
              >
                {/* Seamless Tile Graphic */}
                <div className="relative w-full h-full m-0 p-0">
                  <img
                    src={isLight ? assets.tileLight : assets.tileDark}
                    alt={`Tile ${r},${c}`}
                    draggable={false}
                    className="w-full h-full object-fill pointer-events-none select-none block transition-opacity group-hover:brightness-110"
                  />

                  {/* Interactive Diamond Polygon for Clean Highlight */}
                  <svg
                    viewBox={`0 0 ${tileWidth} ${tileHeight}`}
                    className="absolute top-0 left-0 w-full pointer-events-none"
                    style={{ height: `${tileHeight}px` }}
                  >
                    {/* Legal Move Diamond Highlight */}
                    {isLegalMove && (
                      <polygon
                        points={`${tileWidth / 2},1 ${tileWidth - 2},${tileHeight / 2} ${tileWidth / 2},${tileHeight - 1} 2,${tileHeight / 2}`}
                        className="fill-amber-400/35 stroke-amber-300 stroke-2 animate-pulse"
                      />
                    )}

                    {/* Starting Position Placement Diamond */}
                    {isValidStart && !isLegalMove && (
                      <polygon
                        points={`${tileWidth / 2},1 ${tileWidth - 2},${tileHeight / 2} ${tileWidth / 2},${tileHeight - 1} 2,${tileHeight / 2}`}
                        className="fill-emerald-400/35 stroke-emerald-300 stroke-2 animate-pulse"
                      />
                    )}

                    {/* Hover Diamond Highlight */}
                    {isHovered && !isLegalMove && !isValidStart && (
                      <polygon
                        points={`${tileWidth / 2},1 ${tileWidth - 2},${tileHeight / 2} ${tileWidth / 2},${tileHeight - 1} 2,${tileHeight / 2}`}
                        className="fill-white/15 stroke-white/40 stroke-1"
                      />
                    )}
                  </svg>
                </div>
              </div>
            );
          })}

          {/* LAYER 1: 2x2 LUSH DEEP PITS (Rendered on top of base tiles with exact 2:1 angle) */}
          {pits.map(pit => {
            // Anchor to the top diamond vertex of cell (pit.r, pit.c)
            const isoTopTile = gridToIso(pit.r, pit.c, tileWidth, tileHeight);
            const topVertexX = isoTopTile.x;
            const topVertexY = isoTopTile.y - tileHeight / 2;
            const pitWidth = tileWidth * 2; // 192px
            const pitHeight = Math.round(pitWidth * PIT_IMAGE_HEIGHT_RATIO); // 120px (640/1024 = 0.625)

            return (
              <div
                key={`pit-${pit.id}`}
                style={{
                  left: `${topVertexX - pitWidth / 2}px`,
                  top: `${topVertexY}px`,
                  width: `${pitWidth}px`,
                  height: `${pitHeight}px`,
                  zIndex: 350 + (pit.r + pit.c) * 10, // Strictly on top of all base tiles
                }}
                className="absolute pointer-events-none"
              >
                <img
                  src={assets.pitLush}
                  alt="Deep Lush Pit"
                  draggable={false}
                  className="w-full h-full object-fill drop-shadow-2xl"
                />
              </div>
            );
          })}

          {/* LAYER 2: 1x1 CRYSTAL PATCHES (Strictly overlays only 1x1 diamond surface) */}
          {/* Elsa's ice (melts at round end) */}
          {(gameState.ice || []).map(t => {
            const iso = gridToIso(t.r, t.c, tileWidth, tileHeight);
            return (
              <svg
                key={`ice-${t.r}-${t.c}`}
                className="absolute pointer-events-none"
                style={{ left: `${iso.x - tileWidth / 2}px`, top: `${iso.y - tileHeight / 2}px`, zIndex: 3 + (t.r + t.c) }}
                width={tileWidth}
                height={tileHeight}
              >
                <polygon
                  points={`${tileWidth / 2},1 ${tileWidth - 1},${tileHeight / 2} ${tileWidth / 2},${tileHeight - 1} 1,${tileHeight / 2}`}
                  fill="rgba(147,210,255,0.5)"
                  stroke="rgba(224,242,254,0.9)"
                  strokeWidth="1.5"
                />
              </svg>
            );
          })}

          {crystals.map(crystal => {
            const iso = gridToIso(crystal.r, crystal.c, tileWidth, tileHeight);
            const w = Math.round(tileWidth * 0.72); // 69px - stays cleanly inside 1x1 tile
            const h = Math.round(tileHeight * 0.85); // 40px

            return (
              <div
                key={`crystal-${crystal.id}`}
                style={{
                  left: `${iso.x - w / 2}px`,
                  top: `${iso.y - h / 2 - 3}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  zIndex: 400 + (crystal.r + crystal.c) * 10,
                }}
                className="absolute pointer-events-none flex items-center justify-center"
              >
                <img
                  src={assets.crystalPatch}
                  alt="Crystal Patch"
                  draggable={false}
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.7)]"
                />
              </div>
            );
          })}

          {/* LAYER 3: L-CORNER STONE WALLS (Fully visible masonry with 100% transparent base floor) */}
          {walls.map(wall => {
            const iso = gridToIso(wall.r, wall.c, tileWidth, tileHeight);

            return (
              <div
                key={`wall-${wall.id}`}
                style={{
                  left: `${iso.x - tileWidth / 2}px`,
                  top: `${iso.y - tileHeight / 2}px`,
                  width: `${tileWidth}px`,
                  height: `${tileImageHeight}px`,
                  zIndex: 400 + (wall.r + wall.c) * 10,
                }}
                className="absolute pointer-events-none overflow-visible"
              >
                {/* 3D Masonry SVG Backdrop: Guarantees 100% sharp visibility along back edges */}
                <svg
                  viewBox={`0 0 ${tileWidth} ${tileHeight}`}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible"
                  style={{ height: `${tileHeight}px` }}
                >
                  <defs>
                    <linearGradient id={`wallGradNW-${wall.id}`} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#44403c" />
                      <stop offset="100%" stopColor="#a8a29e" />
                    </linearGradient>
                    <linearGradient id={`wallGradNE-${wall.id}`} x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#292524" />
                      <stop offset="100%" stopColor="#78716c" />
                    </linearGradient>
                  </defs>
                  {/* NW Back Edge Wall: from (0, 24) to (48, 0), height 18px */}
                  <polygon
                    points={`0,${tileHeight / 2} ${tileWidth / 2},0 ${tileWidth / 2},-18 0,${tileHeight / 2 - 18}`}
                    fill={`url(#wallGradNW-${wall.id})`}
                    stroke="#d6d3d1"
                    strokeWidth="1.2"
                  />
                  {/* NE Back Edge Wall: from (48, 0) to (96, 24), height 18px */}
                  <polygon
                    points={`${tileWidth / 2},0 ${tileWidth},${tileHeight / 2} ${tileWidth},${tileHeight / 2 - 18} ${tileWidth / 2},-18`}
                    fill={`url(#wallGradNE-${wall.id})`}
                    stroke="#a8a29e"
                    strokeWidth="1.2"
                  />
                  {/* Top Wall Crest Cap */}
                  <polyline
                    points={`0,${tileHeight / 2 - 18} ${tileWidth / 2},-18 ${tileWidth},${tileHeight / 2 - 18}`}
                    stroke="#f5f5f4"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  {/* Decorative stone block divider notches */}
                  <line x1={tileWidth * 0.25} y1={tileHeight * 0.25 - 18} x2={tileWidth * 0.25} y2={tileHeight * 0.25} stroke="#1c1917" strokeWidth="1" opacity="0.6" />
                  <line x1={tileWidth * 0.75} y1={tileHeight * 0.25 - 18} x2={tileWidth * 0.75} y2={tileHeight * 0.25} stroke="#1c1917" strokeWidth="1" opacity="0.6" />
                </svg>

                {/* Textured High-Res Image Overlay */}
                <img
                  src={assets.stoneWall}
                  alt="L-Corner Stone Wall"
                  draggable={false}
                  className="relative w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                />
              </div>
            );
          })}

          {/* LAYER 4: COINS (SILVER & GOLD) */}
          {coins.map(coin => {
            const iso = gridToIso(coin.r, coin.c, tileWidth, tileHeight);
            const isGold = coin.type === 'gold';
            const coinSize = isGold ? 36 : 30;

            return (
              <div
                key={`coin-${coin.id}`}
                style={{
                  left: `${iso.x - coinSize / 2}px`,
                  top: `${iso.y - coinSize / 2 - 8}px`,
                  width: `${coinSize}px`,
                  height: `${coinSize}px`,
                  zIndex: 500 + (coin.r + coin.c) * 10,
                }}
                className="absolute pointer-events-none flex items-center justify-center animate-bounce duration-1000"
              >
                <img
                  src={isGold ? assets.goldCoin : assets.silverCoin}
                  alt={isGold ? 'Gold Coin (+3)' : 'Silver Coin (+1)'}
                  draggable={false}
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                />
                <span
                  className={`absolute -bottom-2 px-1 py-0.2 rounded-full text-[8px] font-black tracking-tight border shadow-xs ${
                    isGold
                      ? 'bg-amber-400 text-amber-950 border-amber-300'
                      : 'bg-slate-200 text-slate-900 border-slate-300'
                  }`}
                >
                  +{coin.value}
                </span>
              </div>
            );
          })}

          {/* LAYER 5: BOARD PIECES / FIGURINES (Compact unselected footprint so tiles behind remain 100% clickable) */}
          {boardPieces.map(piece => {
            const isAnimated = animatingPiece?.pieceId === piece.id;
            const r = isAnimated ? animatingPiece.currentR : piece.r;
            const c = isAnimated ? animatingPiece.currentC : piece.c;
            const iso = gridToIso(r, c, tileWidth, tileHeight);
            const isSelected = selectedPieceId === piece.id;
            const isCurrentPlayerPiece = piece.owner === gameState.currentTurn;

            // Compact unselected box (30x30px) leaves surrounding and back tiles completely unblocked!
            const boxWidth = isSelected ? 56 : 30;
            const boxHeight = isSelected ? 68 : 30;
            const boxLeft = iso.x - boxWidth / 2;
            const boxTop = isSelected ? iso.y - 48 : iso.y - 15;

            return (
              <div
                key={`piece-${piece.id}`}
                onClick={e => {
                  e.stopPropagation();
                  onPieceClick(piece);
                }}
                style={{
                  left: `${boxLeft}px`,
                  top: `${boxTop}px`,
                  width: `${boxWidth}px`,
                  height: `${boxHeight}px`,
                  zIndex: 700 + (Math.round(r) + Math.round(c)) * 10 + (isSelected ? 50 : 0),
                }}
                className={`absolute cursor-pointer transition-all duration-200 flex items-center justify-center ${
                  isCurrentPlayerPiece && !piece.hasMovedThisTurn && gameState.phase === 'move'
                    ? 'hover:brightness-125'
                    : ''
                }`}
              >
                {renderPieceFigure(piece, isSelected)}
              </div>
            );
          })}

          {/* LAYER 6: FLOATING SCORE POPUPS (+1, +3) */}
          {floatingScorePopups.map(popup => {
            const iso = gridToIso(popup.r, popup.c, tileWidth, tileHeight);
            return (
              <div
                key={`popup-${popup.id}`}
                style={{
                  left: `${iso.x - 20}px`,
                  top: `${iso.y - 50}px`,
                  zIndex: 9999,
                }}
                className="absolute pointer-events-none animate-out fade-out slide-out-to-top duration-700"
              >
                <div
                  className="px-2 py-0.5 rounded-full text-xs font-black shadow-lg border border-white/60"
                  style={{
                    backgroundColor: popup.color,
                    color: '#000',
                  }}
                >
                  {popup.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
