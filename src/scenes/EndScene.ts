import Phaser from "phaser";
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  DEPTH,
  FONT_FAMILY,
  BTN_SRC,
  SAFE_BOTTOM,
  s,
} from "../config/GameConfig";
import { LEVELS } from "../config/Levels";
import { setMaxLevel, setLevelScore, setLevelStars } from "../utils/Storage";

interface EndData {
  result: "win" | "lose";
  levelIdx: number;
  score: number;
  stars: number;
  mistakes: number;
  sequenceLength: number;
  sequenceProgress: number;
}

export class EndScene extends Phaser.Scene {
  constructor() {
    super("EndScene");
  }

  create(data: EndData): void {
    const isWin = data.result === "win";
    const level = data.levelIdx + 1;

    const bg = this.add.image(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2, "bg");
    bg.setDisplaySize(DESIGN_WIDTH, DESIGN_HEIGHT);
    bg.setDepth(DEPTH.BG);

    const overlay = this.add.rectangle(
      DESIGN_WIDTH / 2,
      DESIGN_HEIGHT / 2,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      0x000000,
      0.6,
    );
    overlay.setDepth(DEPTH.OVERLAY - 1);

    const titleY = DESIGN_HEIGHT * 0.25;
    const titleColor = isWin ? "#ffffff" : "#ff6666";
    const titleStr = isWin ? "LEVEL CLEARED!" : "TIME'S UP";

    const title = this.add.text(DESIGN_WIDTH / 2, titleY, titleStr, {
      fontFamily: FONT_FAMILY,
      fontSize: `${s(40)}px`,
      color: titleColor,
      stroke: "#1a1a1a",
      strokeThickness: s(5),
      align: "center",
    });
    title.setOrigin(0.5);
    title.setDepth(DEPTH.OVERLAY);

    this.tweens.add({
      targets: title,
      scale: { from: 0.5, to: 1 },
      duration: 400,
      ease: "Back.easeOut",
    });

    if (isWin) {
      setMaxLevel(level + 1);
      setLevelScore(level, data.score);
      setLevelStars(level, data.stars);

      this.showStars(DESIGN_HEIGHT * 0.38, data.stars);

      const scoreText = this.add.text(
        DESIGN_WIDTH / 2,
        DESIGN_HEIGHT * 0.48,
        `Score: ${data.score}`,
        {
          fontFamily: FONT_FAMILY,
          fontSize: `${s(28)}px`,
          color: "#ffdd00",
          stroke: "#1a1a1a",
          strokeThickness: s(3),
        },
      );
      scoreText.setOrigin(0.5);
      scoreText.setDepth(DEPTH.OVERLAY);

      const isLastLevel = data.levelIdx >= LEVELS.length - 1;
      const btnKey = isLastLevel ? "btn_play" : "btn_nextlevel";
      const nextLevelIdx = isLastLevel ? 0 : data.levelIdx + 1;

      this.createButton(btnKey, () => {
        if (isLastLevel) {
          this.scene.start("StartScene");
        } else {
          this.scene.start("GameScene", { levelIdx: nextLevelIdx });
        }
      });
    } else {
      const progress = data.sequenceProgress;
      const total = data.sequenceLength;
      const ratio = total > 0 ? progress / total : 0;

      let msg: string;
      if (ratio >= 0.75) {
        msg = `SO CLOSE! ${progress}/${total} tiles!`;
      } else if (ratio >= 0.5) {
        msg = "HALFWAY THERE!";
      } else {
        msg = "DON'T GIVE UP!";
      }

      const subtitle = this.add.text(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.38, msg, {
        fontFamily: FONT_FAMILY,
        fontSize: `${s(22)}px`,
        color: "#ffffff",
        stroke: "#1a1a1a",
        strokeThickness: s(3),
        align: "center",
      });
      subtitle.setOrigin(0.5);
      subtitle.setDepth(DEPTH.OVERLAY);

      this.createButton("btn_retry", () => {
        this.scene.start("GameScene", { levelIdx: data.levelIdx });
      });
    }

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  private showStars(y: number, count: number): void {
    const starSize = s(36);
    const gap = s(12);
    const totalW = 3 * starSize + 2 * gap;
    const startX = (DESIGN_WIDTH - totalW) / 2 + starSize / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (starSize + gap);
      const filled = i < count;

      const star = this.add.text(x, y, filled ? "★" : "☆", {
        fontFamily: FONT_FAMILY,
        fontSize: `${starSize}px`,
        color: filled ? "#ffdd00" : "#666666",
      });
      star.setOrigin(0.5);
      star.setDepth(DEPTH.OVERLAY);
      star.setAlpha(0);

      this.tweens.add({
        targets: star,
        alpha: 1,
        scale: { from: 2, to: 1 },
        duration: 350,
        delay: 200 + i * 200,
        ease: "Back.easeOut",
      });
    }
  }

  private createButton(key: string, onClick: () => void): void {
    const btnY = DESIGN_HEIGHT - SAFE_BOTTOM - s(120);
    const btn = this.add.image(DESIGN_WIDTH / 2, btnY, key);
    const baseScale = s(240) / BTN_SRC.w;
    btn.setScale(baseScale);
    btn.setDepth(DEPTH.OVERLAY);
    btn.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn,
      y: btnY - s(5),
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    btn.on("pointerdown", () => {
      btn.setScale(baseScale * 0.94);
    });

    btn.on("pointerup", () => {
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", onClick);
    });

    btn.on("pointerout", () => {
      btn.setScale(baseScale);
    });
  }
}
