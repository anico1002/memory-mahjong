import Phaser from "phaser";
import "./style.css";
import { DESIGN_WIDTH, DESIGN_HEIGHT, RENDER_SCALE } from "./config/GameConfig";
import { BootScene } from "./scenes/BootScene";
import { StartScene } from "./scenes/StartScene";
import { GameScene } from "./scenes/GameScene";
import { UIScene } from "./scenes/UIScene";
import { EndScene } from "./scenes/EndScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0a6b2a",
  scale: {
    mode: Phaser.Scale.NONE,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  input: {
    activePointers: 2,
  },
  render: {
    pixelArt: false,
    antialias: true,
  },
  scene: [BootScene, StartScene, GameScene, UIScene, EndScene],
};

const game = new Phaser.Game(config);

function resizeGame() {
  const w = window.visualViewport?.width ?? window.innerWidth;
  const h = window.visualViewport?.height ?? window.innerHeight;
  const dpr = RENDER_SCALE;
  game.scale.resize(w * dpr, h * dpr);
  game.canvas.style.width = w + "px";
  game.canvas.style.height = h + "px";
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resizeGame);
} else {
  window.addEventListener("resize", resizeGame);
}

setTimeout(resizeGame, 100);
setTimeout(resizeGame, 300);

const inIframe = window.self !== window.top;

if (!inIframe) {
  const requestFullscreenOnce = () => {
    const target =
      (game.canvas.parentElement as HTMLElement | null) ?? game.canvas;
    if (document.fullscreenElement) return;
    try {
      if (target.requestFullscreen) {
        target.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
      } else {
        const webkit = (
          target as unknown as { webkitRequestFullscreen?: () => void }
        ).webkitRequestFullscreen;
        if (webkit) webkit.call(target);
      }
    } catch {
      // ignore
    }
  };

  const firstTouchHandler = () => {
    requestFullscreenOnce();
    game.canvas.removeEventListener("pointerdown", firstTouchHandler);
    game.canvas.removeEventListener("touchstart", firstTouchHandler);
  };

  game.canvas.addEventListener("pointerdown", firstTouchHandler, {
    passive: true,
  });
  game.canvas.addEventListener("touchstart", firstTouchHandler, {
    passive: true,
  });
}
