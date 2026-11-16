// FROSTLINE v4 — input: click a river segment to freeze/thaw it, keys for
// start, relic picks, restart, endless, sound. Coordinates are converted
// from the page's CSS pixels into the game's 1280x720 space.

export function attachInput(canvas, game) {
  canvas.addEventListener('pointerdown', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 1280;
    const y = ((ev.clientY - rect.top) / rect.height) * 720;
    game.click(x, y);
  });
  window.addEventListener('keydown', (ev) => {
    if (ev.key === ' ') { ev.preventDefault(); game.pressSpace(); }
    else if (ev.key === 'r' || ev.key === 'R') game.pressRestart();
    else if (ev.key === 'c' || ev.key === 'C') game.pressContinue();
    else if (ev.key === 'm' || ev.key === 'M') game.toggleSound();
    else if (ev.key === '1' || ev.key === '2' || ev.key === '3') game.pickRelic(Number(ev.key) - 1);
  });
}
