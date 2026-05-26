import Phaser from "phaser";
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  DEPTH,
  FONT_FAMILY,
  FLIP,
  GRID,
  HUD,
  RENDER_SCALE,
  SEQUENCE_BAR,
  TILE_ASPECT,
  TILE_SRC,
  s,
} from "../config/GameConfig";
import {
  LEVELS,
  generateLevel,
  type TileKey,
  type GeneratedLevel,
  type LevelDef,
} from "../config/Levels";

type GamePhase = "SETUP" | "MEMORIZE" | "RECALL" | "RESULT";

const BACK_TEXTURE = "mystery_tile";

interface ActiveTile {
  sprite: Phaser.GameObjects.Image;
  col: number;
  row: number;
  tileKey: TileKey;
  revealed: boolean;
  flipping: boolean;
  targetX: number;
  targetY: number;
}

const PENALTY_SECONDS = 3;

// Grid tile spacing — zero gap, tiles touching
const COL_GAP_PX = 0;
const ROW_GAP_PX = 0;

// Sequence container styling
const SEQ_CONTAINER_PAD = 12;
const SEQ_TILE_SHRINK = 0.78;
const SEQ_TILE_GAP_RATIO = 0.06;

// Entry animation
const ENTRY_GAP_START = 70;
const ENTRY_GAP_END = 15;
const ENTRY_DURATION = 550;

function mixColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

export class GameScene extends Phaser.Scene {
  private levelIdx = 0;
  private levelDef!: LevelDef;
  private generated!: GeneratedLevel;

  private phase: GamePhase = "SETUP";
  private tiles: ActiveTile[] = [];
  private sequenceSprites: Phaser.GameObjects.Image[] = [];
  private sequenceIndex = 0;
  private combo = 0;
  private mistakes = 0;
  private score = 0;

  private tileW = 0;
  private tileH = 0;
  private tileScale = 0;
  private colStep = 0;
  private rowStep = 0;
  private gridStartX = 0;
  private gridStartY = 0;

  private seqTileW = 0;
  private seqTileH = 0;
  private seqTileScale = 0;
  private seqContainerH = 0;

  private countdownText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("GameScene");
  }

  init(data?: { levelIdx?: number }): void {
    this.levelIdx = Math.max(
      0,
      Math.min(LEVELS.length - 1, data?.levelIdx ?? 0),
    );
    this.levelDef = LEVELS[this.levelIdx];
    this.phase = "SETUP";
    this.tiles = [];
    this.sequenceSprites = [];
    this.sequenceIndex = 0;
    this.combo = 0;
    this.mistakes = 0;
    this.score = 0;
    this.countdownText = null;
  }

  create(): void {
    const bg = this.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, "bg");
    bg.setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT);
    bg.setDepth(DEPTH.BG);

    this.generated = generateLevel(this.levelDef);

    this.computeGridMetrics();
    this.buildSequenceBar();
    this.buildGrid();
    this.animateEntry();

    this.scene.launch("UIScene", {
      levelNumber: this.levelDef.level,
      timerSec: this.levelDef.timerSec,
      sequenceLength: this.levelDef.sequenceLength,
    });

    const uiScene = this.scene.get("UIScene");
    uiScene.events.on("timer-expired", this.onTimerExpired, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      uiScene.events.off("timer-expired", this.onTimerExpired, this);
      this.scene.stop("UIScene");
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
  }

  // --- Layout ---

  private computeGridMetrics(): void {
    const cols = this.levelDef.gridCols;
    const rows = this.levelDef.gridRows;
    const seqLen = this.levelDef.sequenceLength;
    const pad = s(SEQ_CONTAINER_PAD);

    const totalZoneH = GRID.bottomY - SEQUENCE_BAR.topY;
    const gridZoneW = GRID.maxWidth;
    const colGap = COL_GAP_PX * RENDER_SCALE;
    const rowGap = ROW_GAP_PX * RENDER_SCALE;

    // Reserve space for sequence container
    const gridFraction = 0.78;
    const gridZoneH = totalZoneH * gridFraction;

    // Fit tiles with fixed small gaps
    const fitW = (gridZoneW - (cols - 1) * colGap) / cols;
    const fitTileH = (gridZoneH - (rows - 1) * rowGap) / rows;
    const fitH = fitTileH / TILE_ASPECT;

    this.tileW = Math.floor(Math.min(fitW, fitH));
    this.tileH = Math.floor(this.tileW * TILE_ASPECT);
    this.tileScale = this.tileW / TILE_SRC.w;
    this.colStep = this.tileW + colGap;
    this.rowStep = this.tileH + rowGap;

    // Sequence tiles — smaller, inside a container matching HUD width
    this.seqTileW = Math.floor(this.tileW * SEQ_TILE_SHRINK);
    this.seqTileH = Math.floor(this.seqTileW * TILE_ASPECT);
    this.seqTileScale = this.seqTileW / TILE_SRC.w;
    const seqGap = Math.floor(this.seqTileW * SEQ_TILE_GAP_RATIO);

    // Container width = HUD width; check tiles fit inside
    const containerInnerW = HUD.displayWidth - pad * 2;
    const seqInnerW = seqLen * this.seqTileW + (seqLen - 1) * seqGap;
    if (seqInnerW > containerInnerW) {
      this.seqTileW = Math.floor(
        (containerInnerW - seqGap * (seqLen - 1)) / seqLen,
      );
      this.seqTileH = Math.floor(this.seqTileW * TILE_ASPECT);
      this.seqTileScale = this.seqTileW / TILE_SRC.w;
    }

    // Container: "Objective" label + tiles + padding
    const labelH = s(28);
    this.seqContainerH = pad + labelH + this.seqTileH + pad;

    // Grid positioning — below sequence container
    const totalGridW = cols * this.tileW + (cols - 1) * colGap;
    const totalGridH = rows * this.tileH + (rows - 1) * rowGap;

    const gridTopY = SEQUENCE_BAR.topY + this.seqContainerH + s(12);
    const remainingH = GRID.bottomY - gridTopY;

    this.gridStartX = (DESIGN_WIDTH - totalGridW) / 2 + this.tileW / 2;
    this.gridStartY =
      gridTopY + (remainingH - totalGridH) / 2 + this.tileH / 2;
  }

  private tilePos(col: number, row: number): { x: number; y: number } {
    return {
      x: this.gridStartX + col * this.colStep,
      y: this.gridStartY + row * this.rowStep,
    };
  }

  // --- Build ---

  private buildGrid(): void {
    for (const gt of this.generated.grid) {
      const pos = this.tilePos(gt.col, gt.row);
      const sprite = this.add.image(pos.x, pos.y, BACK_TEXTURE);
      sprite.setScale(this.tileScale);
      sprite.setDepth(DEPTH.GRID_TILE + gt.row);
      sprite.setInteractive();
      sprite.setAlpha(0);

      this.tiles.push({
        sprite,
        col: gt.col,
        row: gt.row,
        tileKey: gt.tileKey,
        revealed: false,
        flipping: false,
        targetX: pos.x,
        targetY: pos.y,
      });
    }
  }

  private buildSequenceBar(): void {
    const seq = this.generated.sequence;
    const seqGap = Math.floor(this.seqTileW * SEQ_TILE_GAP_RATIO);
    const innerW = seq.length * this.seqTileW + (seq.length - 1) * seqGap;

    const containerW = DESIGN_WIDTH;
    const containerBottomY = SEQUENCE_BAR.topY + this.seqContainerH;
    const containerTopY = 0;
    const containerH = containerBottomY - containerTopY;
    const cornerR = s(32);

    // Dark background — from top of screen down, rounded only at bottom
    const g = this.add.graphics();
    g.setDepth(DEPTH.SEQUENCE_BAR - 2);
    g.fillStyle(0x000000, 0.20);
    g.fillRoundedRect(0, containerTopY, containerW, containerH, {
      tl: 0,
      tr: 0,
      bl: cornerR,
      br: cornerR,
    });

    // "Objective" label — shadowed text like the timer
    const labelY = SEQUENCE_BAR.topY + s(14);
    const shadowOffset = s(1);
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONT_FAMILY,
      fontSize: `${s(22)}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: s(3),
    };
    this.add.text(DESIGN_WIDTH / 2, labelY + shadowOffset, "Objective", {
      ...labelStyle,
      color: "#000000",
    }).setOrigin(0.5).setDepth(DEPTH.SEQUENCE_BAR);
    this.add.text(DESIGN_WIDTH / 2, labelY, "Objective", labelStyle)
      .setOrigin(0.5).setDepth(DEPTH.SEQUENCE_BAR);

    // Place sequence tiles below the label
    const tilesStartX =
      DESIGN_WIDTH / 2 - innerW / 2 + this.seqTileW / 2;
    const tileCenterY = labelY + s(18) + this.seqTileH / 2;

    for (let i = 0; i < seq.length; i++) {
      const x = tilesStartX + i * (this.seqTileW + seqGap);
      const sprite = this.add.image(x, tileCenterY, `tile_${seq[i].tileKey}`);
      sprite.setScale(this.seqTileScale);
      sprite.setDepth(DEPTH.SEQUENCE_BAR);
      sprite.setAlpha(1);
      this.sequenceSprites.push(sprite);
    }
  }

  private updateSequenceHighlight(): void {
    for (let i = 0; i < this.sequenceSprites.length; i++) {
      if (i < this.sequenceIndex) {
        this.sequenceSprites[i].setAlpha(1);
      } else if (i === this.sequenceIndex) {
        this.sequenceSprites[i].setAlpha(1);
      } else {
        this.sequenceSprites[i].setAlpha(0.2);
      }
    }
  }

  // --- Entry animation (hunch&match1 style) ---

  private animateEntry(): void {
    const N = this.tiles.length;
    if (N === 0) return;

    // Sort by diagonal (col + row) for a natural cascade
    const sorted = [...this.tiles].sort((a, b) => {
      const da = a.col + a.row;
      const db = b.col + b.row;
      if (da !== db) return da - db;
      return a.col - b.col;
    });

    // Accelerating stagger delays
    const delays: number[] = [0];
    for (let i = 1; i < N; i++) {
      const t = N > 2 ? (i - 1) / (N - 2) : 0;
      const gap = ENTRY_GAP_START + (ENTRY_GAP_END - ENTRY_GAP_START) * t;
      delays.push(delays[i - 1] + gap);
    }

    for (let i = 0; i < sorted.length; i++) {
      const tile = sorted[i];
      const sp = tile.sprite;

      // Start offscreen: left half flies from left, right half from right
      const fromLeft = tile.targetX < DESIGN_WIDTH / 2;
      const startX = fromLeft
        ? -this.tileW * 1.5
        : DESIGN_WIDTH + this.tileW * 1.5;

      sp.x = startX;
      sp.y = tile.targetY;

      this.tweens.add({
        targets: sp,
        x: tile.targetX,
        alpha: 1,
        duration: ENTRY_DURATION,
        delay: delays[i],
        ease: "Back.easeOut",
        easeParams: [0.9],
      });
    }

    const lastFinishMs = delays[N - 1] + ENTRY_DURATION + 200;
    this.time.delayedCall(lastFinishMs, () => this.startMemorizePhase());
  }

  // --- Game phases ---

  private startMemorizePhase(): void {
    this.phase = "MEMORIZE";

    const STAGGER_MS = 50;
    let delay = 0;
    for (const tile of this.tiles) {
      this.time.delayedCall(delay, () => {
        this.flipTile(tile, `tile_${tile.tileKey}`, () => {
          tile.revealed = true;
        });
      });
      delay += STAGGER_MS;
    }

    const flipDoneMs = delay + FLIP.liftMs + FLIP.dropMs + 100;
    const memorizeTotalMs = this.levelDef.memorizeTimeSec * 1000;

    this.time.delayedCall(flipDoneMs, () => {
      this.startCountdown(this.levelDef.memorizeTimeSec);
    });

    this.time.delayedCall(flipDoneMs + memorizeTotalMs, () => {
      this.endMemorizePhase();
    });
  }

  private startCountdown(seconds: number): void {
    const gridCenterY =
      this.gridStartY +
      ((this.levelDef.gridRows - 1) * this.rowStep) / 2;

    this.countdownText = this.add.text(
      DESIGN_WIDTH / 2,
      gridCenterY,
      String(Math.ceil(seconds)),
      {
        fontFamily: FONT_FAMILY,
        fontSize: `${s(72)}px`,
        color: "#ffffff",
        stroke: "#1a1a1a",
        strokeThickness: s(5),
      },
    );
    this.countdownText.setOrigin(0.5);
    this.countdownText.setDepth(DEPTH.COUNTDOWN);
    this.countdownText.setAlpha(0.7);

    let remaining = Math.ceil(seconds);
    this.time.addEvent({
      delay: 1000,
      repeat: remaining - 1,
      callback: () => {
        remaining--;
        if (this.countdownText) {
          if (remaining > 0) {
            this.countdownText.setText(String(remaining));
            this.tweens.add({
              targets: this.countdownText,
              scale: { from: 1.3, to: 1 },
              duration: 300,
              ease: "Back.easeOut",
            });
          } else {
            this.countdownText.destroy();
            this.countdownText = null;
          }
        }
      },
    });
  }

  private endMemorizePhase(): void {
    if (this.phase !== "MEMORIZE") return;
    this.phase = "RECALL";

    if (this.countdownText) {
      this.countdownText.destroy();
      this.countdownText = null;
    }

    let delay = 0;
    for (const tile of this.tiles) {
      if (tile.revealed) {
        this.time.delayedCall(delay, () => {
          this.flipTile(tile, BACK_TEXTURE, () => {
            tile.revealed = false;
          });
        });
        delay += 20;
      }
    }

    const flipDoneMs = delay + FLIP.liftMs + FLIP.dropMs + 100;
    this.time.delayedCall(flipDoneMs, () => {
      this.updateSequenceHighlight();
      const uiScene = this.scene.get("UIScene");
      uiScene.events.emit("start-timer");
    });
  }

  // --- Tap handling ---

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== "RECALL") return;

    const tile = this.pickTileAt(pointer.x, pointer.y);
    if (!tile || tile.revealed || tile.flipping) return;

    const target = this.generated.sequence[this.sequenceIndex];
    if (tile.col === target.gridCol && tile.row === target.gridRow) {
      this.onCorrectTap(tile);
    } else {
      this.onWrongTap(tile);
    }
  }

  private pickTileAt(px: number, py: number): ActiveTile | null {
    for (const tile of this.tiles) {
      const sp = tile.sprite;
      const hw = sp.displayWidth / 2;
      const hh = sp.displayHeight / 2;
      if (
        px >= sp.x - hw &&
        px <= sp.x + hw &&
        py >= sp.y - hh &&
        py <= sp.y + hh
      ) {
        return tile;
      }
    }
    return null;
  }

  private onCorrectTap(tile: ActiveTile): void {
    this.flipTile(tile, `tile_${tile.tileKey}`, () => {
      tile.revealed = true;
    });

    this.tweens.add({
      targets: tile.sprite,
      scale: { from: this.tileScale * 1.1, to: this.tileScale },
      duration: 200,
      ease: "Back.easeOut",
    });

    this.combo++;
    const comboMult = Math.min(this.combo, 5);
    this.score += 100 * comboMult;

    if (this.combo >= 2) {
      this.showComboText(
        tile.sprite.x,
        tile.sprite.y - this.tileH / 2,
        this.combo,
      );
    }

    this.sequenceIndex++;

    const uiScene = this.scene.get("UIScene");
    uiScene.events.emit("sequence-progress", this.sequenceIndex);

    this.updateSequenceHighlight();

    try {
      navigator.vibrate?.(15);
    } catch {
      /* ignore */
    }

    if (this.sequenceIndex >= this.generated.sequence.length) {
      this.onLevelComplete();
    }
  }

  private onWrongTap(tile: ActiveTile): void {
    this.combo = 0;
    this.mistakes++;

    tile.sprite.setTint(0xff4444);
    this.time.delayedCall(300, () => {
      tile.sprite.clearTint();
    });

    this.cameras.main.shake(200, 0.008);

    const uiScene = this.scene.get("UIScene");
    uiScene.events.emit("time-penalty", PENALTY_SECONDS);

    try {
      navigator.vibrate?.([50, 30, 50]);
    } catch {
      /* ignore */
    }
  }

  private onLevelComplete(): void {
    this.phase = "RESULT";

    let delay = 0;
    for (const tile of this.tiles) {
      if (!tile.revealed) {
        this.time.delayedCall(delay, () => {
          this.flipTile(tile, `tile_${tile.tileKey}`, () => {
            tile.revealed = true;
          });
        });
        delay += 40;
      }
    }

    const revealDone = delay + FLIP.liftMs + FLIP.dropMs + 200;

    this.time.delayedCall(revealDone, () => {
      const uiScene = this.scene.get("UIScene");
      const timerRemaining =
        (uiScene as unknown as { timerRemaining?: number }).timerRemaining ?? 0;

      let stars = 1;
      if (
        this.mistakes === 0 &&
        timerRemaining > this.levelDef.timerSec * 0.5
      ) {
        stars = 3;
      } else if (this.mistakes <= 1) {
        stars = 2;
      }

      this.scene.start("EndScene", {
        result: "win",
        levelIdx: this.levelIdx,
        score: this.score,
        stars,
        mistakes: this.mistakes,
        sequenceLength: this.levelDef.sequenceLength,
        sequenceProgress: this.sequenceIndex,
      });
    });
  }

  private onTimerExpired(): void {
    if (this.phase !== "RECALL") return;
    this.phase = "RESULT";

    this.cameras.main.shake(380, 0.018);

    this.time.delayedCall(500, () => {
      this.scene.start("EndScene", {
        result: "lose",
        levelIdx: this.levelIdx,
        score: this.score,
        stars: 0,
        mistakes: this.mistakes,
        sequenceLength: this.levelDef.sequenceLength,
        sequenceProgress: this.sequenceIndex,
      });
    });
  }

  // --- Flip animation ---

  private flipTile(
    tile: ActiveTile,
    toTexture: string,
    onComplete?: () => void,
  ): void {
    if (tile.flipping) return;
    tile.flipping = true;

    const sprite = tile.sprite;
    const restY = sprite.y;
    const peakY = restY - s(FLIP.liftPx);
    const edgeScaleX = s(FLIP.edgeWidthPx) / TILE_SRC.w;

    this.tweens.add({
      targets: sprite,
      scaleX: edgeScaleX,
      y: peakY,
      duration: FLIP.liftMs,
      ease: "Cubic.easeOut",
      onUpdate: (tw: Phaser.Tweens.Tween) => {
        sprite.setTint(mixColor(0xffffff, FLIP.edgeTint, tw.progress));
      },
      onComplete: () => {
        sprite.setTexture(toTexture);
        sprite.scaleX = edgeScaleX;
        sprite.setTint(FLIP.edgeTint);

        this.tweens.add({
          targets: sprite,
          scaleX: this.tileScale,
          y: restY,
          duration: FLIP.dropMs,
          ease: "Back.easeOut",
          easeParams: [FLIP.landingOvershoot],
          onUpdate: (tw: Phaser.Tweens.Tween) => {
            sprite.setTint(
              mixColor(FLIP.edgeTint, 0xffffff, tw.progress),
            );
          },
          onComplete: () => {
            sprite.clearTint();
            sprite.setScale(this.tileScale);
            tile.flipping = false;
            onComplete?.();
          },
        });
      },
    });
  }

  // --- Visual feedback ---

  private showComboText(x: number, y: number, combo: number): void {
    const colors = [0xffffff, 0xffdd00, 0xff8800, 0xff4400, 0xff0000];
    const colorIdx = Math.min(combo - 2, colors.length - 1);
    const color = "#" + colors[colorIdx].toString(16).padStart(6, "0");

    const txt = this.add.text(x, y, `${combo}x`, {
      fontFamily: FONT_FAMILY,
      fontSize: `${s(24 + combo * 2)}px`,
      color,
      stroke: "#1a1a1a",
      strokeThickness: s(3),
    });
    txt.setOrigin(0.5);
    txt.setDepth(DEPTH.OVERLAY);

    this.tweens.add({
      targets: txt,
      y: y - s(50),
      alpha: 0,
      scale: { from: 1.2, to: 0.8 },
      duration: 700,
      ease: "Cubic.easeOut",
      onComplete: () => txt.destroy(),
    });
  }
}
