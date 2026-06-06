const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const spiceEl = document.querySelector("#spice");
const bestEl = document.querySelector("#best");
const startButton = document.querySelector("#startButton");
const fireButton = document.querySelector("#fireButton");
const controlButtons = document.querySelectorAll(".control[data-key]");

const keys = new Set();
const bestKey = "curry-walk-best";
let best = Number(localStorage.getItem(bestKey) || 0);
let lastTime = 0;
let game;
let audioContext = null;
let audioUnlocked = false;
let nextStepSoundAt = 0;
let lastStepDirection = "";

bestEl.textContent = best;

["touchstart", "pointerdown", "mousedown", "keydown"].forEach((eventName) => {
  window.addEventListener(eventName, unlockAudio, { once: false, passive: true });
});

function resetGame() {
  game = {
    running: false,
    over: false,
    time: 0,
    score: 0,
    spice: 0,
    speed: 180,
    player: {
      x: 160,
      y: 292,
      radius: 34,
      step: 0,
      invincible: 0
    },
    roadOffset: 0,
    spices: [],
    spoons: [],
    omelets: [],
    bullets: [],
    bursts: [],
    fireCooldown: 0,
    nextSpice: 0.4,
    nextSpoon: 1.2,
    nextOmelet: 2.4
  };
}

resetGame();
requestAnimationFrame(loop);

startButton.addEventListener("click", () => {
  ensureAudio();
  if (game.running) {
    return;
  }

  if (game.over) {
    resetGame();
  }

  game.running = true;
  startButton.textContent = "Go";
  playStartSound();
});

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "f", "F", " "].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === " ") {
    ensureAudio();
    startButton.click();
    return;
  }

  if (event.key === "f" || event.key === "F") {
    ensureAudio();
    fireSpiceBullet();
    return;
  }

  ensureAudio();
  keys.add(normalizeKey(event.key));
});

window.addEventListener("keyup", (event) => {
  keys.delete(normalizeKey(event.key));
});

controlButtons.forEach((button) => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", () => {
    ensureAudio();
    keys.add(key);
    button.classList.add("pressed");
  });

  button.addEventListener("pointerup", () => {
    keys.delete(key);
    button.classList.remove("pressed");
  });

  button.addEventListener("pointerleave", () => {
    keys.delete(key);
    button.classList.remove("pressed");
  });
});

fireButton.addEventListener("click", () => {
  ensureAudio();
  fireSpiceBullet();
});

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);
  lastTime = timestamp;

  if (game.running) {
    update(dt);
  }

  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  game.time += dt;
  game.score += dt * 12;
  game.speed = 180 + Math.min(game.time * 8, 180);
  game.roadOffset = (game.roadOffset + game.speed * dt) % 96;
  game.player.step += dt * 10;
  game.player.invincible = Math.max(0, game.player.invincible - dt);
  game.fireCooldown = Math.max(0, game.fireCooldown - dt);

  movePlayer(dt);
  spawnItems(dt);
  updateItems(dt);
  updateBullets(dt);
  updateBursts(dt);
  checkCollisions();
  updateHud();
}

function fireSpiceBullet() {
  if (!game.running || game.spice <= 0 || game.fireCooldown > 0) {
    if (game.running && game.spice <= 0) {
      addBurst(game.player.x + 54, game.player.y - 30, "no spice", "#b42318");
      playNoSpiceSound();
    }
    return;
  }

  game.spice -= 1;
  game.fireCooldown = 0.22;
  game.bullets.push({
    x: game.player.x + 52,
    y: game.player.y - 4,
    radius: 9,
    speed: 560,
    spin: 0
  });
  addBurst(game.player.x + 60, game.player.y - 34, "-1 spice", "#b42318");
  playFireSound();
  updateHud();
}

function movePlayer(dt) {
  const player = game.player;
  const speed = 260;
  let direction = "";

  if (keys.has("ArrowLeft")) {
    player.x -= speed * dt;
    direction = "left";
  }
  if (keys.has("ArrowRight")) {
    player.x += speed * dt;
    direction = "right";
  }
  if (keys.has("ArrowUp")) {
    player.y -= speed * dt;
    direction = "up";
  }
  if (keys.has("ArrowDown")) {
    player.y += speed * dt;
    direction = "down";
  }

  player.x = clamp(player.x, 70, canvas.width - 70);
  player.y = clamp(player.y, 190, canvas.height - 74);

  if (direction) {
    playStepSound(direction);
  }
}

function spawnItems(dt) {
  game.nextSpice -= dt;
  game.nextSpoon -= dt;
  game.nextOmelet -= dt;

  if (game.nextSpice <= 0) {
    game.spices.push({
      x: canvas.width + 30,
      y: random(210, canvas.height - 80),
      radius: 15,
      spin: random(0, Math.PI * 2)
    });
    game.nextSpice = random(0.55, 1.05);
  }

  if (game.nextSpoon <= 0) {
    game.spoons.push({
      x: canvas.width + 80,
      y: random(215, canvas.height - 90),
      radius: 26,
      spin: random(-0.35, 0.35)
    });
    game.nextSpoon = random(1.0, 1.6);
  }

  if (game.nextOmelet <= 0) {
    const y = random(220, canvas.height - 95);
    game.omelets.push({
      x: canvas.width + 110,
      y,
      baseY: y,
      radius: 38,
      step: random(0, Math.PI * 2),
      speedBoost: random(20, 70)
    });
    game.nextOmelet = random(2.2, 3.4);
  }
}

function updateItems(dt) {
  const itemSpeed = game.speed + 90;
  game.spices.forEach((spice) => {
    spice.x -= itemSpeed * dt;
    spice.spin += dt * 5;
  });
  game.spoons.forEach((spoon) => {
    spoon.x -= (itemSpeed + 30) * dt;
  });
  game.omelets.forEach((omelet) => {
    omelet.x -= (itemSpeed + omelet.speedBoost) * dt;
    omelet.step += dt * 7;
    omelet.y = omelet.baseY + Math.sin(omelet.step) * 18;
  });

  game.spices = game.spices.filter((spice) => spice.x > -50);
  game.spoons = game.spoons.filter((spoon) => spoon.x > -90);
  game.omelets = game.omelets.filter((omelet) => omelet.x > -100);
}

function updateBullets(dt) {
  game.bullets.forEach((bullet) => {
    bullet.x += bullet.speed * dt;
    bullet.spin += dt * 14;
  });
  game.bullets = game.bullets.filter((bullet) => bullet.x < canvas.width + 40);
}

function updateBursts(dt) {
  game.bursts.forEach((burst) => {
    burst.life -= dt;
    burst.y -= dt * 18;
  });
  game.bursts = game.bursts.filter((burst) => burst.life > 0);
}

function checkCollisions() {
  const player = game.player;

  game.spices = game.spices.filter((spice) => {
    if (distance(player, spice) < player.radius + spice.radius) {
      game.spice += 1;
      game.score += 45;
      addBurst(spice.x, spice.y, "+spice", "#0f766e");
      playSpiceSound();
      return false;
    }
    return true;
  });

  game.bullets = game.bullets.filter((bullet) => {
    const hitIndex = game.omelets.findIndex((omelet) => distance(bullet, omelet) < bullet.radius + omelet.radius - 8);

    if (hitIndex >= 0) {
      const [omelet] = game.omelets.splice(hitIndex, 1);
      game.score += 120;
      addBurst(omelet.x, omelet.y - 24, "omurice down", "#b42318");
      playHitSound();
      return false;
    }

    return true;
  });

  if (player.invincible > 0) {
    return;
  }

  for (const spoon of game.spoons) {
    if (distance(player, spoon) < player.radius + spoon.radius - 8) {
      gameOver();
      return;
    }
  }

  for (const omelet of game.omelets) {
    if (distance(player, omelet) < player.radius + omelet.radius - 10) {
      gameOver("オムライスにぶつかった");
      return;
    }
  }
}

function gameOver(message = "スプーンに当たった") {
  game.running = false;
  game.over = true;
  game.message = message;
  game.player.invincible = 1;
  best = Math.max(best, Math.floor(game.score));
  localStorage.setItem(bestKey, String(best));
  bestEl.textContent = best;
  startButton.textContent = "Retry";
  playGameOverSound();
}

function updateHud() {
  scoreEl.textContent = Math.floor(game.score);
  spiceEl.textContent = game.spice;
}

function draw() {
  drawBackground();
  drawRoad();
  drawSpices();
  drawSpoons();
  drawOmelets();
  drawBullets();
  drawPlayer();
  drawBursts();

  if (!game.running) {
    drawOverlay();
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#f5d99f");
  sky.addColorStop(0.42, "#e9b96c");
  sky.addColorStop(1, "#b98549");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 248, 226, 0.5)";
  for (let i = 0; i < 8; i++) {
    const x = (i * 170 - game.roadOffset * 0.35) % (canvas.width + 170) - 90;
    ctx.beginPath();
    ctx.ellipse(x, 70 + (i % 3) * 28, 42, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRoad() {
  ctx.fillStyle = "#8d6234";
  ctx.beginPath();
  ctx.moveTo(0, 176);
  ctx.bezierCurveTo(260, 145, 520, 170, canvas.width, 138);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#d6a45f";
  for (let x = -96; x < canvas.width + 96; x += 96) {
    const drawX = x - game.roadOffset;
    ctx.fillRect(drawX, 336, 48, 8);
  }

  ctx.fillStyle = "rgba(73, 46, 22, 0.22)";
  for (let i = 0; i < 18; i++) {
    const x = (i * 73 - game.roadOffset * 0.7) % (canvas.width + 90) - 40;
    ctx.beginPath();
    ctx.ellipse(x, 470 + (i % 4) * 13, 28, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const p = game.player;
  const bob = Math.sin(p.step) * 6;
  const leg = Math.sin(p.step) * 12;
  const y = p.y + bob;

  ctx.save();
  ctx.translate(p.x, y);

  ctx.strokeStyle = "#3f2a18";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16, 30);
  ctx.lineTo(-24 + leg, 52);
  ctx.moveTo(16, 30);
  ctx.lineTo(26 - leg, 52);
  ctx.stroke();

  ctx.fillStyle = "#fff6df";
  ctx.strokeStyle = "#6c5840";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, 60, 42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d17a22";
  ctx.beginPath();
  ctx.ellipse(8, 2, 42, 28, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff4cf";
  ctx.beginPath();
  ctx.ellipse(-28, -5, 22, 16, -0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7a3e19";
  drawChunk(16, -10, 8);
  drawChunk(28, 6, 7);
  drawChunk(-2, 15, 6);

  ctx.fillStyle = "#24180f";
  ctx.beginPath();
  ctx.arc(-10, -15, 4, 0, Math.PI * 2);
  ctx.arc(16, -15, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#24180f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(3, -8, 12, 0.2, Math.PI - 0.2);
  ctx.stroke();

  ctx.restore();
}

function drawChunk(x, y, size) {
  ctx.beginPath();
  ctx.roundRect(x - size, y - size, size * 2, size * 1.6, 4);
  ctx.fill();
}

function drawSpices() {
  game.spices.forEach((spice) => {
    ctx.save();
    ctx.translate(spice.x, spice.y);
    ctx.rotate(spice.spin);
    ctx.fillStyle = "#0f766e";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const x = Math.cos(angle) * 16;
      const y = Math.sin(angle) * 16;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f8e7a8";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawSpoons() {
  game.spoons.forEach((spoon) => {
    ctx.save();
    ctx.translate(spoon.x, spoon.y);
    ctx.rotate(spoon.spin);
    ctx.fillStyle = "#dbe2e8";
    ctx.strokeStyle = "#8996a3";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(-12, 0, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c6d0d8";
    ctx.fillRect(6, -5, 58, 10);
    ctx.strokeRect(6, -5, 58, 10);
    ctx.restore();
  });
}

function drawOmelets() {
  game.omelets.forEach((omelet) => {
    const foot = Math.sin(omelet.step) * 10;

    ctx.save();
    ctx.translate(omelet.x, omelet.y);

    ctx.strokeStyle = "#4a2b17";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-18, 28);
    ctx.lineTo(-28 + foot, 48);
    ctx.moveTo(18, 28);
    ctx.lineTo(28 - foot, 48);
    ctx.stroke();

    ctx.fillStyle = "#fffaf0";
    ctx.strokeStyle = "#7b5833";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 10, 58, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f5c542";
    ctx.strokeStyle = "#a86d1a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -2, 50, 32, -0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#c5261b";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.bezierCurveTo(-14, -20, 0, 10, 14, -6);
    ctx.bezierCurveTo(22, -16, 28, -8, 34, -13);
    ctx.stroke();

    ctx.fillStyle = "#24180f";
    ctx.beginPath();
    ctx.arc(-14, -9, 4, 0, Math.PI * 2);
    ctx.arc(14, -9, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#24180f";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -1, 10, Math.PI + 0.2, Math.PI * 2 - 0.2);
    ctx.stroke();

    ctx.restore();
  });
}

function drawBullets() {
  game.bullets.forEach((bullet) => {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.spin);

    ctx.fillStyle = "#b42318";
    ctx.strokeStyle = "#6b1d12";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8e7a8";
    ctx.beginPath();
    ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawBursts() {
  game.bursts.forEach((burst) => {
    ctx.globalAlpha = Math.max(burst.life, 0);
    ctx.fillStyle = burst.color;
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(burst.text, burst.x, burst.y);
    ctx.globalAlpha = 1;
  });
}

function drawOverlay() {
  ctx.fillStyle = "rgba(35, 31, 26, 0.44)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff8ed";
  ctx.strokeStyle = "#dbc8ae";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 210, canvas.height / 2 - 94, 420, 188, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#231f1a";
  ctx.textAlign = "center";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.fillText(game.over ? game.message : "カレーが歩くゲーム", canvas.width / 2, canvas.height / 2 - 28);

  ctx.fillStyle = "#6c6258";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("矢印キー / WASD で歩く", canvas.width / 2, canvas.height / 2 + 14);
  ctx.fillText("F / Fireでスパイス弾を撃ってオムライスを倒す", canvas.width / 2, canvas.height / 2 + 44);
}

function addBurst(x, y, text, color) {
  game.bursts.push({ x, y, text, color, life: 1 });
}

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function unlockAudio() {
  const context = ensureAudio();

  if (audioUnlocked || !context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const volume = context.createGain();

  volume.gain.setValueAtTime(0.0001, now);
  oscillator.frequency.setValueAtTime(220, now);
  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.01);
  audioUnlocked = true;
}

function playTone({ frequency, duration, type = "sine", gain = 0.05, slideTo = null }) {
  const context = ensureAudio();

  if (!context || context.state === "suspended") {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const volume = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  volume.gain.setValueAtTime(0.0001, now);
  volume.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function playStepSound(direction) {
  if (!audioContext || !game.running) {
    return;
  }

  const now = audioContext.currentTime;
  if (now < nextStepSoundAt && direction === lastStepDirection) {
    return;
  }

  const pitches = {
    up: 560,
    right: 470,
    left: 410,
    down: 310
  };

  lastStepDirection = direction;
  nextStepSoundAt = now + 0.15;
  playTone({
    frequency: pitches[direction],
    duration: 0.055,
    type: "triangle",
    gain: 0.035,
    slideTo: pitches[direction] * 0.82
  });
}

function playStartSound() {
  playTone({ frequency: 392, duration: 0.08, type: "triangle", gain: 0.045, slideTo: 523 });
  setTimeout(() => playTone({ frequency: 659, duration: 0.1, type: "triangle", gain: 0.04 }), 90);
}

function playSpiceSound() {
  playTone({ frequency: 740, duration: 0.08, type: "sine", gain: 0.045, slideTo: 980 });
}

function playFireSound() {
  playTone({ frequency: 260, duration: 0.07, type: "square", gain: 0.035, slideTo: 520 });
}

function playNoSpiceSound() {
  playTone({ frequency: 180, duration: 0.12, type: "sawtooth", gain: 0.03, slideTo: 130 });
}

function playHitSound() {
  playTone({ frequency: 520, duration: 0.06, type: "square", gain: 0.045, slideTo: 180 });
  setTimeout(() => playTone({ frequency: 180, duration: 0.08, type: "triangle", gain: 0.04 }), 70);
}

function playGameOverSound() {
  playTone({ frequency: 320, duration: 0.12, type: "sawtooth", gain: 0.04, slideTo: 190 });
  setTimeout(() => playTone({ frequency: 150, duration: 0.22, type: "sawtooth", gain: 0.035, slideTo: 80 }), 120);
}

function normalizeKey(key) {
  const map = {
    w: "ArrowUp",
    a: "ArrowLeft",
    s: "ArrowDown",
    d: "ArrowRight"
  };
  return map[key] || key;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
