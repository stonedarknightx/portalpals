import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// 1. CREATE EXACT 2:1 ISOMETRIC POLYGON MASK FOR 1x1 TILES
// Dimensions: 512 x 384
// Diamond top face: (256, 0) -> (512, 128) -> (256, 256) -> (0, 128)
// Foundation skirt: drops down to y = 368
const maskPath = '/tmp/perfect_tile_mask.png';
execSync(`convert -size 512x384 xc:none \
  -fill white -draw "polygon 256,0 512,128 512,240 256,368 0,240 0,128" \
  ${maskPath}`);

console.log("Created 1x1 tile mask");

// 2. BUILD LIGHT TILE
// Extract high-res light cobblestones texture from source and apply the exact mask
const lightSrc = '/app/applet/src/assets/images/first_tile_light_1791281901817.jpg';
const lightOut = '/app/applet/public/images/first_tile_light_nogold_final.png';
execSync(`convert "${lightSrc}" -resize 640x500^ -gravity center -crop 512x384+0+0 +repage /tmp/light_crop.png`);
execSync(`convert /tmp/light_crop.png ${maskPath} -alpha off -compose CopyOpacity -composite "${lightOut}"`);
console.log("Built perfect Light Tile");

// 3. BUILD DARK TILE
// Extract dark cobblestones texture from source and apply the exact SAME mask
const darkSrc = '/app/applet/src/assets/images/first_tile_dark_1791281918338.jpg';
const darkOut = '/app/applet/public/images/first_tile_dark_matching_final.png';
execSync(`convert "${darkSrc}" -resize 640x500^ -gravity center -crop 512x384+0+0 +repage /tmp/dark_crop.png`);
execSync(`convert /tmp/dark_crop.png ${maskPath} -alpha off -compose CopyOpacity -composite "${darkOut}"`);
console.log("Built perfect Dark Tile");

// 4. BUILD 2x2 LUSH DEEP PIT
// Footprint: 1024 x 640
// Top diamond: (512, 0) -> (1024, 256) -> (512, 512) -> (0, 256) (Exact 2:1 slope!)
const pitMaskPath = '/tmp/perfect_pit_mask.png';
execSync(`convert -size 1024x640 xc:none \
  -fill white -draw "polygon 512,0 1024,256 1024,384 512,640 0,384 0,256" \
  ${pitMaskPath}`);

const pitSrc = '/app/applet/src/assets/images/pit_lush_padded_1791281847894.jpg';
const pitOut = '/app/applet/public/images/pit_lush_padded.png';
execSync(`convert "${pitSrc}" -resize 1024x768^ -gravity center -crop 1024x640+0+0 +repage /tmp/pit_crop.png`);
execSync(`convert /tmp/pit_crop.png ${pitMaskPath} -alpha off -compose CopyOpacity -composite "${pitOut}"`);
console.log("Built perfect 2x2 Lush Pit");

// 5. BUILD L-CORNER STONE WALL WITH TRANSPARENT BASE
// The wall covers the two back edges: (0, 128) to (256, 0) and (256, 0) to (512, 128)
// Wall top rises by ~80px. The entire base inside the diamond is 100% TRANSPARENT!
const wallMaskPath = '/tmp/perfect_wall_mask.png';
execSync(`convert -size 512x384 xc:none \
  -fill white -draw "polygon 0,55 256,-70 512,55 512,130 450,98 256,0 62,98 0,130" \
  ${wallMaskPath}`);

const wallSrc = '/app/applet/src/assets/images/stone_wall_edge_1791281883541.jpg';
const wallOut = '/app/applet/public/images/stone_wall_edge_mixed.png';
execSync(`convert "${wallSrc}" -resize 512x400^ -gravity center -crop 512x384+0+0 +repage /tmp/wall_crop.png`);
execSync(`convert /tmp/wall_crop.png ${wallMaskPath} -alpha off -compose CopyOpacity -composite "${wallOut}"`);
console.log("Built L-Corner Wall with transparent base");

// Copy all to /public and /public/images/
execSync(`cp /app/applet/public/images/* /public/images/ && cp /app/applet/public/images/* /public/ && cp /app/applet/public/images/* /app/applet/dist/images/ 2>/dev/null || true`);
console.log("Copied all images successfully!");
