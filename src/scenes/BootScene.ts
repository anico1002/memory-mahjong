import Phaser from "phaser";
import { ALL_TILE_KEYS, TILE_KEY_TO_FILE } from "../config/Levels";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.image("bg", "/assets/bg.png");
    this.load.image("splash", "/assets/splash.png");

    this.load.image("hud_bg", "/assets/hud/hud.png");
    this.load.image("timer_icn", "/assets/hud/timer-icn.png");
    this.load.image("mark_green", "/assets/hud/mark-hud.png");
    this.load.image("mark_gray", "/assets/hud/gray-mark.png");

    this.load.image("btn_play", "/assets/play-btn.png");
    this.load.image("btn_retry", "/assets/retry-btn.png");
    this.load.image("btn_nextlevel", "/assets/nextlevel-btn.png");

    this.load.image("star", "/assets/star.png");
    this.load.image("star_disabled", "/assets/star-disabled.png");

    this.load.image("powerups", "/assets/powerups.png");

    this.load.image("empty_tile", "/assets/tiles/empty-tile.png");
    this.load.image("mystery_tile", "/assets/tiles/mystery.png");

    for (const key of ALL_TILE_KEYS) {
      this.load.image(`tile_${key}`, `/assets/tiles/${TILE_KEY_TO_FILE[key]}`);
    }
  }

  create(): void {
    const fontFace = 'bold 24px "Lilita One"';
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts
        .load(fontFace)
        .then(() => this.scene.start("StartScene"))
        .catch(() => this.scene.start("StartScene"));
    } else {
      this.scene.start("StartScene");
    }
  }
}
