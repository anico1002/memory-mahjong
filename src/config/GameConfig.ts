const _dpr =
  typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
export const RENDER_SCALE = Math.min(Math.max(_dpr, 1), 3);

const REFERENCE_WIDTH = 390;
const REFERENCE_HEIGHT = 844;

function readViewport(): { w: number; h: number } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { w: REFERENCE_WIDTH, h: REFERENCE_HEIGHT };
  }
  const el = document.getElementById("game");
  if (el) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { w: rect.width, h: rect.height };
    }
  }
  return { w: window.innerWidth, h: window.innerHeight };
}
const { w: _vpW, h: _vpH } = readViewport();

export const VIEWPORT_W = _vpW;
export const VIEWPORT_H = _vpH;

export const VIEW_SCALE = Math.min(
  _vpW / REFERENCE_WIDTH,
  _vpH / REFERENCE_HEIGHT,
);

const S = RENDER_SCALE * VIEW_SCALE;
export const s = (n: number): number => n * S;

export const DESIGN_WIDTH = _vpW * RENDER_SCALE;
export const DESIGN_HEIGHT = _vpH * RENDER_SCALE;

function readSafeInset(varName: string): number {
  if (typeof window === "undefined" || typeof document === "undefined")
    return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (!raw) return 0;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const SAFE_TOP = readSafeInset("--safe-top") * RENDER_SCALE;
export const SAFE_BOTTOM = readSafeInset("--safe-bottom") * RENDER_SCALE;

export const FONT_FAMILY =
  '"Lilita One", system-ui, -apple-system, sans-serif';

// --- HUD image constants (same asset as Guess-the-Color) ---

const HUD_IMG_W = 1077;
const HUD_IMG_H = 269;
const HUD_IMG_MAIN_BAR_H = 210;

export const HUD_MAIN_BAR_FRACTION = HUD_IMG_MAIN_BAR_H / HUD_IMG_H;
export const HUD_IMG_CONST = { W: HUD_IMG_W, H: HUD_IMG_H, MAIN_BAR_H: HUD_IMG_MAIN_BAR_H };
export const HUD_MARKER_IMG = {
  W: 66, H: 21, centerY: 240,
  centersX: [463.5, 538.5, 613.5] as readonly number[],
};

// --- Depth layers ---

export const DEPTH = {
  BG: 0,
  GRID_TILE: 10,
  SEQUENCE_BAR: 20,
  COUNTDOWN: 30,
  HUD_BG: 100,
  HUD_TEXT: 110,
  OVERLAY: 200,
};

// --- HUD layout ---

const HUD_TOP_CLEARANCE = Math.max(SAFE_TOP, 56 * S);
const HUD_TARGET_WIDTH = Math.min(DESIGN_WIDTH * 0.92, 520 * S);
const HUD_HEIGHT_EST = HUD_TARGET_WIDTH / (HUD_IMG_W / HUD_IMG_H);

export const HUD = {
  centerX: DESIGN_WIDTH / 2,
  centerY: HUD_TOP_CLEARANCE + HUD_HEIGHT_EST / 2,
  bottomY: HUD_TOP_CLEARANCE + HUD_HEIGHT_EST,
  displayWidth: HUD_TARGET_WIDTH,
  estHeight: HUD_HEIGHT_EST,
  bgNudgeY: s(15),
};

// --- Sequence bar zone (below HUD) ---

const SEQUENCE_TOP_Y = HUD.bottomY + HUD.bgNudgeY + s(12);

export const SEQUENCE_BAR = {
  topY: SEQUENCE_TOP_Y,
  maxWidth: DESIGN_WIDTH * 0.92,
};

// --- Powerups zone (bottom of screen, reserved for future) ---

const POWERUPS_HEIGHT = s(80);
const POWERUPS_TOP_Y = DESIGN_HEIGHT - SAFE_BOTTOM - POWERUPS_HEIGHT;

export const POWERUPS = {
  centerX: DESIGN_WIDTH / 2,
  topY: POWERUPS_TOP_Y,
  centerY: POWERUPS_TOP_Y + POWERUPS_HEIGHT / 2,
  height: POWERUPS_HEIGHT,
};

// --- Grid zone (below sequence, above powerups) ---

const GRID_BOTTOM_Y = POWERUPS_TOP_Y - s(12);

export const GRID = {
  bottomY: GRID_BOTTOM_Y,
  centerX: DESIGN_WIDTH / 2,
  maxWidth: DESIGN_WIDTH * 0.78,
};

// --- Flip animation constants (ported from hunch&match1) ---

export const FLIP = {
  liftMs: 170,
  dropMs: 230,
  liftPx: 16,
  edgeWidthPx: 8,
  landingOvershoot: 2.2,
  edgeTint: 0x9a7a55,
};

// --- Asset source dimensions ---

export const TILE_SRC = { w: 300, h: 315 };
export const TILE_ASPECT = TILE_SRC.h / TILE_SRC.w;
export const EMPTY_TILE_SRC = { w: 210, h: 213 };
export const BTN_SRC = { w: 810, h: 231 };
