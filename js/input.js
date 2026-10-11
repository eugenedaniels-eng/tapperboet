/* ============================================================
   TapperBoet — input.js
   Keyboard state + just-pressed edges (consume each frame).
   ============================================================ */
"use strict";

const Input = (() => {
  const down = new Set();
  const pressed = new Set();

  const CODES = [
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'Enter', 'KeyA', 'KeyD', 'KeyW', 'KeyS',
    'Digit1', 'Digit2', 'Digit3', 'Digit4',
    'KeyV', 'KeyB', 'KeyE', 'KeyP', 'KeyM', 'Escape',
  ];

  window.addEventListener('keydown', e => {
    Sfx.resume(); // unlock audio on first gesture
    if (CODES.includes(e.code)) e.preventDefault();
    if (!down.has(e.code)) pressed.add(e.code);
    down.add(e.code);
  });
  window.addEventListener('keyup', e => {
    down.delete(e.code);
  });
  window.addEventListener('blur', () => down.clear());

  return {
    isDown: (...cs) => cs.some(c => down.has(c)),
    justPressed: (...cs) => cs.some(c => pressed.has(c)),
    endFrame() { pressed.clear(); },
  };
})();
