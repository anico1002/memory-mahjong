import Phaser from "phaser";
import {
  DESIGN_WIDTH,
  DEPTH,
  FONT_FAMILY,
  HUD,
  HUD_IMG_CONST,
  HUD_MAIN_BAR_FRACTION,
  HUD_MARKER_IMG,
  s,
} from "../config/GameConfig";

function makeShadowedText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  fontSizePx: number,
  initial = "",
  fillColor = "#ffffff",
  strokePx = 3,
): { shadow: Phaser.GameObjects.Text; main: Phaser.GameObjects.Text } {
  const stroke = s(strokePx);
  const shadowOffset = s(1);
  const baseStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: FONT_FAMILY,
    fontSize: `${s(fontSizePx)}px`,
    color: fillColor,
    stroke: "#000000",
    strokeThickness: stroke,
  };
  const shadow = scene.add
    .text(x, y + shadowOffset, initial, { ...baseStyle, color: "#000000" })
    .setOrigin(0.5);
  const main = scene.add.text(x, y, initial, baseStyle).setOrigin(0.5);
  return { shadow, main };
}

function drawInsetPill(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  w: number,
  h: number,
  shadowColor: number,
  mainColor: number,
  shadowPx: number,
): void {
  const x = cx - w / 2;
  const y = cy - h / 2;
  g.fillStyle(shadowColor, 1);
  g.fillRoundedRect(x, y, w, h, h / 2);
  g.fillStyle(mainColor, 1);
  g.fillRoundedRect(x, y + shadowPx, w, h - shadowPx, (h - shadowPx) / 2);
}

interface UIData {
  levelNumber: number;
  timerSec: number;
  sequenceLength: number;
}

export class UIScene extends Phaser.Scene {
  timerRemaining = 0;
  private timerTotalSec = 0;
  private timerRunning = false;
  private timerEvent: Phaser.Time.TimerEvent | null = null;
  private timerTextMain!: Phaser.GameObjects.Text;
  private timerTextShadow!: Phaser.GameObjects.Text;

  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBarMaxWidth = 0;
  private progressBarHeight = 0;
  private progressBarLeftX = 0;
  private progressBarY = 0;

  private pillsGraphics!: Phaser.GameObjects.Graphics;
  private pillLayout: Array<{ cx: number; cy: number; w: number; h: number }> =
    [];
  private totalSteps = 3;
  private pillBarLeft = 0;
  private pillMarkerScale = 1;
  private pillMarkerNudgeX = 0;
  private pillMarkerY = 0;
  private pillUnitW = 0;
  private pillUnitH = 0;

  constructor() {
    super({ key: "UIScene", active: false });
  }

  init(data: UIData): void {
    this.timerTotalSec = data.timerSec;
    this.timerRemaining = data.timerSec;
    this.timerRunning = false;
    this.timerEvent = null;
    this.totalSteps = data.sequenceLength;
    // steps reset handled by setStepProgress(0)
  }

  create(): void {
    const data = this.scene.settings.data as UIData;
    this.buildHud(data.levelNumber);
    this.refreshTimer();
    this.refreshProgress();
    this.wireEvents();
  }

  private buildHud(levelNumber: number): void {
    const HUD_BG_NUDGE_Y = HUD.bgNudgeY;
    const hud = this.add.image(
      HUD.centerX,
      HUD.centerY + HUD_BG_NUDGE_Y,
      "hud_bg",
    );
    const targetW = Math.min(DESIGN_WIDTH * 0.92, HUD.displayWidth);
    const scale = targetW / Math.max(1, hud.width);
    hud.setScale(scale);
    hud.setDepth(DEPTH.HUD_BG);

    const barW = hud.displayWidth;
    const barH = hud.displayHeight;
    const mainBarH = barH * HUD_MAIN_BAR_FRACTION;
    const barLeft = HUD.centerX - barW / 2;
    const barTopAnchor = HUD.centerY - barH / 2;
    const barTopImage = hud.y - barH / 2;
    const HUD_MAIN_BAR_NUDGE = s(8);
    const mainBarCenterY = barTopAnchor + mainBarH / 2 + HUD_MAIN_BAR_NUDGE;
    const imgY = (px: number) => barTopImage + px * (barH / HUD_IMG_CONST.H);

    const LEFT_DIVIDER_RATIO = 0.165;
    const RIGHT_DIVIDER_RATIO = 0.855;
    const levelZoneCenterX = barLeft + barW * (LEFT_DIVIDER_RATIO / 2);
    const centerZoneCenterX =
      barLeft + barW * ((LEFT_DIVIDER_RATIO + RIGHT_DIVIDER_RATIO) / 2);

    const LEVEL_GROUP_NUDGE_Y = s(9);
    const LEVEL_GROUP_NUDGE_X = s(5);
    const levelX = levelZoneCenterX + LEVEL_GROUP_NUDGE_X;
    const levelColor = "#3a3a3a";
    this.add
      .text(
        levelX,
        mainBarCenterY - s(17) + LEVEL_GROUP_NUDGE_Y,
        "LEVEL",
        {
          fontFamily: FONT_FAMILY,
          fontSize: `${s(13)}px`,
          color: levelColor,
        },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD_TEXT);
    this.add
      .text(
        levelX,
        mainBarCenterY + s(5) + LEVEL_GROUP_NUDGE_Y,
        String(levelNumber).padStart(2, "0"),
        {
          fontFamily: FONT_FAMILY,
          fontSize: `${s(34)}px`,
          color: levelColor,
        },
      )
      .setOrigin(0.5)
      .setDepth(DEPTH.HUD_TEXT);

    const TIMER_GROUP_NUDGE_Y = s(4);
    const timerRowY =
      barTopAnchor +
      mainBarH * 0.34 +
      HUD_MAIN_BAR_NUDGE +
      TIMER_GROUP_NUDGE_Y;
    const timerText = makeShadowedText(
      this,
      centerZoneCenterX,
      timerRowY,
      26,
      this.formatTime(this.timerRemaining),
    );
    [timerText.shadow, timerText.main].forEach((t) =>
      t.setDepth(DEPTH.HUD_TEXT),
    );
    this.timerTextMain = timerText.main;
    this.timerTextShadow = timerText.shadow;

    const barLeftInner = barLeft + barW * (LEFT_DIVIDER_RATIO + 0.045);
    const barRightInner = barLeft + barW * (RIGHT_DIVIDER_RATIO - 0.025);
    const progressW = barRightInner - barLeftInner;
    const progressH = mainBarH * 0.2 - s(4);
    const PROGRESS_NUDGE_Y = s(2);
    const progressY =
      barTopAnchor + mainBarH * 0.74 + HUD_MAIN_BAR_NUDGE + PROGRESS_NUDGE_Y;

    this.progressBarLeftX = barLeftInner;
    this.progressBarY = progressY;
    this.progressBarMaxWidth = progressW;
    this.progressBarHeight = progressH;

    const channel = this.add.graphics();
    channel.setDepth(DEPTH.HUD_BG + 1);
    const shadowPx = s(1);
    channel.fillStyle(0xa8a8a8, 1);
    channel.fillRoundedRect(
      barLeftInner,
      progressY - progressH / 2,
      progressW,
      progressH,
      progressH / 2,
    );
    channel.fillStyle(0xcccccc, 1);
    channel.fillRoundedRect(
      barLeftInner,
      progressY - progressH / 2 + shadowPx,
      progressW,
      progressH - shadowPx,
      (progressH - shadowPx) / 2,
    );

    this.progressBar = this.add.graphics();
    this.progressBar.setDepth(DEPTH.HUD_TEXT);

    // Restart zone (right side)
    const restartZone = this.add.zone(
      barLeft + barW * 0.93,
      mainBarCenterY,
      barW * 0.14,
      mainBarH,
    );
    restartZone.setInteractive();
    restartZone.setDepth(DEPTH.HUD_TEXT + 5);
    restartZone.on("pointerup", () => {
      const gameScene = this.scene.get("GameScene");
      gameScene.events.emit("restart-level");
    });

    // Step pills
    const markerScale = barW / HUD_IMG_CONST.W;
    const MARKER_NUDGE_X = s(1);
    const MARKER_NUDGE_Y = -s(4);
    const markerY = imgY(HUD_MARKER_IMG.centerY) + MARKER_NUDGE_Y;
    const pillW = HUD_MARKER_IMG.W * markerScale;
    const pillH = HUD_MARKER_IMG.H * markerScale;

    this.pillBarLeft = barLeft;
    this.pillMarkerScale = markerScale;
    this.pillMarkerNudgeX = MARKER_NUDGE_X;
    this.pillMarkerY = markerY;
    this.pillUnitW = pillW;
    this.pillUnitH = pillH;

    this.rebuildPillLayout(this.totalSteps);
    this.pillsGraphics = this.add.graphics();
    this.pillsGraphics.setDepth(DEPTH.HUD_TEXT + 4);
    this.setStepProgress(0);
  }

  private rebuildPillLayout(total: number): void {
    const sourceCenter = 538.5;
    const maxRange = 150;
    const maxSpacing = 75;
    const spacing = Math.min(maxSpacing, maxRange / Math.max(total - 1, 1));
    const pillW = total <= 3 ? this.pillUnitW : Math.min(this.pillUnitW, spacing * 0.85);

    this.pillLayout = [];
    for (let i = 0; i < total; i++) {
      const offset = (i - (total - 1) / 2) * spacing;
      const imgX = sourceCenter + offset;
      this.pillLayout.push({
        cx:
          this.pillBarLeft +
          imgX * this.pillMarkerScale +
          this.pillMarkerNudgeX,
        cy: this.pillMarkerY,
        w: pillW,
        h: this.pillUnitH,
      });
    }
  }

  private setStepProgress(completed: number): void {
    this.pillsGraphics.clear();
    for (let i = 0; i < this.pillLayout.length; i++) {
      const p = this.pillLayout[i];
      const isDone = i < completed;
      const shadow = isDone ? 0x3aa05a : 0xa8a8a8;
      const main = isDone ? 0x4ec76e : 0xcccccc;
      drawInsetPill(
        this.pillsGraphics,
        p.cx,
        p.cy,
        p.w,
        p.h,
        shadow,
        main,
        s(1),
      );
    }
  }

  private wireEvents(): void {
    const gameScene = this.scene.get("GameScene");

    gameScene.events.on("start-timer", this.startTimer, this);
    gameScene.events.on("sequence-progress", this.onSequenceProgress, this);
    gameScene.events.on("time-penalty", this.onTimePenalty, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameScene.events.off("start-timer", this.startTimer, this);
      gameScene.events.off(
        "sequence-progress",
        this.onSequenceProgress,
        this,
      );
      gameScene.events.off("time-penalty", this.onTimePenalty, this);
      if (this.timerEvent) this.timerEvent.destroy();
    });
  }

  private startTimer(): void {
    if (this.timerRunning) return;
    this.timerRunning = true;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.timerRemaining <= 0) return;
        this.timerRemaining--;
        this.refreshTimer();
        this.refreshProgress();
        if (this.timerRemaining <= 0) {
          this.timerRunning = false;
          if (this.timerEvent) this.timerEvent.destroy();
          this.events.emit("timer-expired");
        }
      },
    });
  }

  private onSequenceProgress(progress: number): void {
    this.setStepProgress(progress);
  }

  private onTimePenalty(seconds: number): void {
    this.timerRemaining = Math.max(0, this.timerRemaining - seconds);
    this.refreshTimer();
    this.refreshProgress();

    if (this.timerRemaining <= 0) {
      this.timerRunning = false;
      if (this.timerEvent) this.timerEvent.destroy();
      this.events.emit("timer-expired");
    }
  }

  private formatTime(sec: number): string {
    const safe = Math.max(0, sec);
    const m = Math.floor(safe / 60);
    const ss = safe % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  private refreshTimer(): void {
    const txt = this.formatTime(this.timerRemaining);
    this.timerTextMain.setText(txt);
    this.timerTextShadow.setText(txt);
    if (this.timerRemaining <= 10) {
      this.timerTextMain.setColor("#ff6b6b");
    }
  }

  private refreshProgress(): void {
    const frac =
      this.timerTotalSec > 0
        ? Math.max(0, this.timerRemaining / this.timerTotalSec)
        : 0;
    const w = this.progressBarMaxWidth * frac;
    const h = this.progressBarHeight;
    const x = this.progressBarLeftX;
    const y = this.progressBarY - h / 2;

    this.progressBar.clear();
    if (w <= 1) return;
    const radius = h / 2;
    this.progressBar.fillStyle(0xe57b1f, 1);
    this.progressBar.fillRoundedRect(x, y, w, h, radius);
    if (w > radius * 2) {
      this.progressBar.fillStyle(0xf7c91a, 0.85);
      this.progressBar.fillRoundedRect(
        x + radius * 0.1,
        y + h * 0.08,
        w - radius * 0.2,
        h * 0.55,
        radius * 0.6,
      );
    }
  }
}
