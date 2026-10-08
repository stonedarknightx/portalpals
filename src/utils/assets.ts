// Fixed art set (bundled in /public/images). Custom upload support was removed.
export interface AssetMap {
  tileLight: string; tileDark: string; tileDarkChecker: string; pitLush: string;
  islandBoard: string; stoneWall: string; crystalPatch: string; robotIso: string; goldCoin: string; silverCoin: string;
  piecePlaceholders: Record<string, string>;
}

/** Prefix a /public path with the site's base URL (needed on GitHub Pages, where the
 *  game lives at /portalpals/ instead of the domain root). */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

export const DEFAULT_ASSETS: AssetMap = {
  tileLight: asset('/images/first_tile_light_nogold_final.png'),
  tileDark: asset('/images/first_tile_dark_matching_final.png'),
  tileDarkChecker: asset('/images/iso_tile_dark_checker.png'),
  pitLush: asset('/images/pit_lush_padded.png'),
  islandBoard: asset('/images/island_board.png'),
  stoneWall: asset('/images/stone_wall_edge_mixed.png'),
  crystalPatch: asset('/images/crystal_patch_overlay_final.png'),
  robotIso: asset('/images/robot_iso_cutout.png'),
  goldCoin: asset('/images/gold_coin.png'),
  silverCoin: asset('/images/silver_coin.png'),
  piecePlaceholders: {},
};
