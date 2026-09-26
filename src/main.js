import { Game } from './game/Game.js';

// Entry point. The game instance is exposed as window.__cfd for automated QA
// (tests drive/inspect it); it does not affect normal play.

function boot() {
  const game = new Game({
    app: document.getElementById('app'),
    stage: document.getElementById('stage'),
    canvas: document.getElementById('game-canvas'),
  });
  game.init();
  window.__cfd = game;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
