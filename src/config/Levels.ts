export type TileKey =
  | "cage"
  | "bomb"
  | "toaster"
  | "coffee"
  | "bread"
  | "sugar"
  | "keyboard"
  | "bird"
  | "butter"
  | "hamburger"
  | "croissant"
  | "fries"
  | "laptop"
  | "phone"
  | "leaf"
  | "ketchup"
  | "feather"
  | "egg"
  | "camera"
  | "bag"
  | "fish"
  | "pie"
  | "pizza"
  | "soda";

export const ALL_TILE_KEYS: TileKey[] = [
  "cage",
  "bomb",
  "toaster",
  "coffee",
  "bread",
  "sugar",
  "keyboard",
  "bird",
  "butter",
  "hamburger",
  "croissant",
  "fries",
  "laptop",
  "phone",
  "leaf",
  "ketchup",
  "feather",
  "egg",
  "camera",
  "bag",
  "fish",
  "pie",
  "pizza",
  "soda",
];

export const TILE_KEY_TO_FILE: Record<TileKey, string> = {
  cage: "cage.png",
  bomb: "bomb.png",
  toaster: "toaster.png",
  coffee: "coffee.png",
  bread: "bread.png",
  sugar: "sugar.png",
  keyboard: "keyboard.png",
  bird: "bird.png",
  butter: "butter.png",
  hamburger: "hamburger.png",
  croissant: "croissant.png",
  fries: "fries.png",
  laptop: "laptop.png",
  phone: "phone.png",
  leaf: "leaf.png",
  ketchup: "ketchup.png",
  feather: "feather.png",
  egg: "egg.png",
  camera: "camera.png",
  bag: "bag.png",
  fish: "fish.png",
  pie: "pie.png",
  pizza: "tile-standard.png",
  soda: "tile-standard-1.png",
};

export interface LevelDef {
  level: number;
  gridCols: number;
  gridRows: number;
  sequenceLength: number;
  memorizeTimeSec: number;
  timerSec: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1, gridCols: 3, gridRows: 3, sequenceLength: 3, memorizeTimeSec: 5, timerSec: 30 },
  { level: 2, gridCols: 3, gridRows: 4, sequenceLength: 3, memorizeTimeSec: 5, timerSec: 30 },
  { level: 3, gridCols: 3, gridRows: 4, sequenceLength: 4, memorizeTimeSec: 4.5, timerSec: 35 },
  { level: 4, gridCols: 4, gridRows: 4, sequenceLength: 4, memorizeTimeSec: 4.5, timerSec: 35 },
  { level: 5, gridCols: 4, gridRows: 4, sequenceLength: 5, memorizeTimeSec: 4, timerSec: 40 },
  { level: 6, gridCols: 4, gridRows: 5, sequenceLength: 5, memorizeTimeSec: 4, timerSec: 40 },
  { level: 7, gridCols: 4, gridRows: 5, sequenceLength: 6, memorizeTimeSec: 3.5, timerSec: 45 },
  { level: 8, gridCols: 5, gridRows: 5, sequenceLength: 6, memorizeTimeSec: 3, timerSec: 45 },
  { level: 9, gridCols: 5, gridRows: 5, sequenceLength: 7, memorizeTimeSec: 3, timerSec: 50 },
  { level: 10, gridCols: 5, gridRows: 5, sequenceLength: 8, memorizeTimeSec: 2.5, timerSec: 55 },
];

export interface GridTile {
  col: number;
  row: number;
  tileKey: TileKey;
}

export interface SequenceItem {
  index: number;
  tileKey: TileKey;
  gridCol: number;
  gridRow: number;
}

export interface GeneratedLevel {
  grid: GridTile[];
  sequence: SequenceItem[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateLevel(def: LevelDef): GeneratedLevel {
  const totalTiles = def.gridCols * def.gridRows;
  const poolSize = Math.min(totalTiles, ALL_TILE_KEYS.length);

  const pool = shuffle(ALL_TILE_KEYS).slice(0, poolSize);

  const gridKeys = shuffle(pool.slice(0, totalTiles));

  const grid: GridTile[] = [];
  for (let row = 0; row < def.gridRows; row++) {
    for (let col = 0; col < def.gridCols; col++) {
      const idx = row * def.gridCols + col;
      grid.push({ col, row, tileKey: gridKeys[idx] });
    }
  }

  const shuffledPositions = shuffle(
    grid.map((_g, i) => i),
  ).slice(0, def.sequenceLength);

  const sequence: SequenceItem[] = shuffledPositions.map((gridIdx, seqIdx) => {
    const tile = grid[gridIdx];
    return {
      index: seqIdx,
      tileKey: tile.tileKey,
      gridCol: tile.col,
      gridRow: tile.row,
    };
  });

  return { grid, sequence };
}
