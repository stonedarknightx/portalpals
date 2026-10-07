// Fixed art set (bundled in /public/images). Custom upload support was removed.
export interface AssetMap {
  tileLight: string; tileDark: string; tileDarkChecker: string; pitLush: string;
  stoneWall: string; crystalPatch: string; robotIso: string; goldCoin: string; silverCoin: string;
  piecePlaceholders: Record<string, string>;
}

export const DEFAULT_ASSETS: AssetMap = {
  tileLight: '/images/first_tile_light_nogold_final.png',
  tileDark: '/images/first_tile_dark_matching_final.png',
  tileDarkChecker: '/images/iso_tile_dark_checker.png',
  pitLush: '/images/pit_lush_padded.png',
  stoneWall: '/images/stone_wall_edge_mixed.png',
  crystalPatch: '/images/crystal_patch_overlay_final.png',
  robotIso: '/images/robot_iso_cutout.png',
  goldCoin: '/images/gold_coin.png',
  silverCoin: '/images/silver_coin.png',
  piecePlaceholders: {},
};
