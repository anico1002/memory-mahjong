import Phaser from "phaser";
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  DEPTH,
  BTN_SRC,
  s,
  SAFE_BOTTOM,
} from "../config/GameConfig";


export class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create(): void {
    // Splash image covers the full screen
    const splash = this.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, "splash");
    const scaleX = DESIGN_WIDTH / splash.width;
    const scaleY = DESIGN_HEIGHT / splash.height;
    splash.setScale(Math.max(scaleX, scaleY));
    splash.setDepth(DEPTH.BG);

    const btnY = DESIGN_HEIGHT - SAFE_BOTTOM - s(120);
    const btn = this.add.image(DESIGN_WIDTH / 2, btnY, "btn_play");
    const baseScale = s(240) / BTN_SRC.w;
    btn.setScale(baseScale);
    btn.setDepth(DEPTH.OVERLAY);
    btn.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn,
      y: btnY - s(6),
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    btn.on("pointerdown", () => {
      btn.setScale(baseScale * 0.94);
    });

    btn.on("pointerup", () => {
      btn.setScale(baseScale);
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameScene", { levelIdx: 0 });
      });
    });

    btn.on("pointerout", () => {
      btn.setScale(baseScale);
    });

    this.cameras.main.fadeIn(380, 0, 0, 0);
  }
}
