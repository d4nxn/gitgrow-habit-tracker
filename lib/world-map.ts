export type WorldTile = { biome: string; label: string; object?: string };
const GRID_SIZE = 6;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;

// Serpentine path: every discovery is adjacent to the previous one.
export const WORLD_ROUTE = [30,31,32,33,34,35,29,28,27,26,25,24,18,19,20,21,22,23,17,16,15,14,13,12,6,7,8,9,10,11,5,4,3,2,1,0] as const;
export const LANDMARK_TILES = [32,27,21,15,9,4,35,24,18,12,6,0] as const;
export const PLAYER_ASSET = "/map/player-v1.png";

const row = (biome: string, labels: string[], object: string): WorldTile[] => labels.map(label => ({ biome, label, object }));
export const WORLD_TILES: WorldTile[] = [
  ...row("summit", ["Snowy summit","Pine pass","Frozen trail","Glacier river","Highland ridge"], "peak"), {biome:"volcano",label:"Ember crater",object:"volcano"},
  ...row("forest", ["Waterfall grove","Quiet woods","Campfire clearing","Old forest path"], "pines"), {biome:"river",label:"Lagoon inlet",object:"river"}, {biome:"canyon",label:"Red stone gate",object:"ruins"},
  {biome:"river",label:"River bend",object:"river"}, {biome:"river",label:"Wooden bridge",object:"bridge"}, {biome:"jungle",label:"Jungle falls",object:"waterfall"}, {biome:"jungle",label:"Hidden ruins",object:"ruins"}, {biome:"jungle",label:"Canopy village",object:"hut"}, {biome:"canyon",label:"Canyon trail",object:"rocks"},
  ...row("forest", ["Mossy trail","Green overlook"], "pines"), ...row("jungle", ["Palm grove","Tropical path"], "palms"), ...row("canyon", ["Stone crossing","Canyon watch"], "rocks"),
  {biome:"forest",label:"Starting camp",object:"campfire"}, {biome:"forest",label:"Trailhead",object:"pines"}, {biome:"beach",label:"Palm beach",object:"palms"}, {biome:"beach",label:"Quiet shore",object:"shell"}, {biome:"lagoon",label:"Turquoise lagoon",object:"rocks"}, {biome:"lagoon",label:"Coral shallows",object:"shell"},
  {biome:"jungle",label:"Canopy edge",object:"palms"}, {biome:"jungle",label:"Rainforest path",object:"waterfall"}, {biome:"forest",label:"Ancient grove",object:"ruins"}, {biome:"forest",label:"Lantern trail",object:"campfire"}, {biome:"summit",label:"Cloud pass",object:"peak"}, {biome:"volcano",label:"Final beacon",object:"volcano"},
];

export function routeRank(tile: number) { return WORLD_ROUTE.indexOf(tile as (typeof WORLD_ROUTE)[number]); }
export function isTileUnlocked(tile: number, unlockedTiles: number) { return routeRank(tile) >= 0 && routeRank(tile) < unlockedTiles; }
export function isNextTile(tile: number, unlockedTiles: number) { return routeRank(tile) === unlockedTiles && unlockedTiles < WORLD_ROUTE.length; }
export function areAdjacentTiles(a: number, b: number) {
  if (a < 0 || b < 0 || a >= TILE_COUNT || b >= TILE_COUNT || a === b) return false;

  const aRow = Math.floor(a / GRID_SIZE);
  const aColumn = a % GRID_SIZE;
  const bRow = Math.floor(b / GRID_SIZE);
  const bColumn = b % GRID_SIZE;

  return Math.abs(aRow - bRow) + Math.abs(aColumn - bColumn) === 1;
}
export function reachableTiles(currentTile: number, unlockedTiles: number) { return WORLD_ROUTE.filter(tile => tile !== currentTile && routeRank(tile) < unlockedTiles && areAdjacentTiles(tile, currentTile)); }
