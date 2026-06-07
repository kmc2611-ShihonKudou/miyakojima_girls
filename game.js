const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const memoryCountEl = document.querySelector("#memoryCount");
const nearTextEl = document.querySelector("#nearText");
const startButton = document.querySelector("#startButton");
const inspectButton = document.querySelector("#inspectButton");
const controlButtons = document.querySelectorAll(".control[data-key]");

const keys = new Set();
let lastTime = 0;
let phase = "title";
let currentRoomId = "ward";
let activeText = null;
let message = "";
let messageTimer = 0;
let endingShown = false;

const inventory = new Set();
const foundMemories = new Set();

const player = {
  x: 480,
  y: 416,
  radius: 18,
  step: 0
};

const requiredItems = ["錆びた鍵", "身分証", "赤いカードキー", "地下の鍵"];

const rooms = {
  ward: {
    name: "白い病室",
    tint: "#111827",
    start: { x: 480, y: 416 },
    exits: [
      { x: 438, y: 78, w: 84, h: 28, to: "hall", spawn: { x: 480, y: 430 }, label: "廊下" }
    ],
    walls: [
      { x: 84, y: 78, w: 792, h: 24 },
      { x: 84, y: 78, w: 24, h: 390 },
      { x: 852, y: 78, w: 24, h: 390 },
      { x: 84, y: 468, w: 792, h: 24 },
      { x: 308, y: 242, w: 210, h: 22 }
    ],
    furniture: [
      { x: 136, y: 130, w: 150, h: 74, label: "ベッド" },
      { x: 628, y: 118, w: 120, h: 52, label: "棚" }
    ],
    objects: [
      memory("mirror", "割れた鏡", 166, 162, "鏡の破片に、知らない顔が映る。いや、たぶん自分の顔だ。名前だけが、まだ見えない。"),
      item("key", "錆びた鍵", 678, 144, "錆びた鍵を拾った。病室の外へ続く冷たい金属の重さだ。"),
      memory("wrist", "患者タグ", 464, 286, "腕に巻かれていたタグには『記憶処置済』とある。処置されたのは、治療のためではなかった。")
    ]
  },
  hall: {
    name: "長い廊下",
    tint: "#0f172a",
    exits: [
      { x: 448, y: 468, w: 72, h: 28, to: "ward", spawn: { x: 480, y: 130 }, label: "病室" },
      { x: 84, y: 236, w: 28, h: 72, to: "office", spawn: { x: 804, y: 270 }, label: "管理室" },
      { x: 852, y: 236, w: 28, h: 72, to: "archive", spawn: { x: 150, y: 270 }, label: "資料室" }
    ],
    walls: [
      { x: 84, y: 78, w: 792, h: 24 },
      { x: 84, y: 78, w: 24, h: 156 },
      { x: 84, y: 310, w: 24, h: 158 },
      { x: 852, y: 78, w: 24, h: 156 },
      { x: 852, y: 310, w: 24, h: 158 },
      { x: 84, y: 468, w: 792, h: 24 },
      { x: 292, y: 202, w: 22, h: 206 },
      { x: 646, y: 148, w: 22, h: 240 }
    ],
    furniture: [
      { x: 392, y: 126, w: 126, h: 42, label: "倒れた椅子" },
      { x: 516, y: 388, w: 180, h: 38, label: "血の跡" }
    ],
    objects: [
      memory("photo", "古い写真", 424, 146, "写真の裏に『帰ってきて』と書かれている。隣に写る人の顔だけが黒く塗りつぶされていた。"),
      memory("rain", "濡れた靴跡", 598, 414, "雨の夜。逃げたのは自分ではない。追いかけていた。足音が、ひとつ多かった。")
    ]
  },
  office: {
    name: "管理室",
    tint: "#17121c",
    exits: [
      { x: 852, y: 236, w: 28, h: 72, to: "hall", spawn: { x: 146, y: 270 }, label: "廊下" },
      { x: 426, y: 468, w: 112, h: 28, to: "cell", spawn: { x: 480, y: 136 }, label: "隔離室", requires: ["赤いカードキー"] }
    ],
    walls: [
      { x: 84, y: 78, w: 792, h: 24 },
      { x: 84, y: 78, w: 24, h: 390 },
      { x: 852, y: 78, w: 24, h: 156 },
      { x: 852, y: 310, w: 24, h: 158 },
      { x: 84, y: 468, w: 342, h: 24 },
      { x: 538, y: 468, w: 338, h: 24 },
      { x: 252, y: 222, w: 420, h: 24 }
    ],
    furniture: [
      { x: 162, y: 126, w: 196, h: 66, label: "机" },
      { x: 620, y: 132, w: 136, h: 74, label: "ロッカー" }
    ],
    objects: [
      item("id", "身分証", 220, 154, "身分証を拾った。写真は自分の顔だが、名前の欄は削られている。"),
      memory("letter", "破れた手紙", 650, 160, "『忘れた方がいい』という文字だけが残っている。忘れたのではない。忘れさせられた。"),
      item("card", "赤いカードキー", 336, 288, "赤いカードキーを拾った。隔離室の扉が開けられそうだ。")
    ]
  },
  archive: {
    name: "資料室",
    tint: "#101724",
    exits: [
      { x: 84, y: 236, w: 28, h: 72, to: "hall", spawn: { x: 804, y: 270 }, label: "廊下" },
      { x: 426, y: 78, w: 112, h: 28, to: "basement", spawn: { x: 480, y: 430 }, label: "地下階段", requires: ["地下の鍵"] }
    ],
    walls: [
      { x: 84, y: 78, w: 342, h: 24 },
      { x: 538, y: 78, w: 338, h: 24 },
      { x: 84, y: 78, w: 24, h: 156 },
      { x: 84, y: 310, w: 24, h: 158 },
      { x: 852, y: 78, w: 24, h: 390 },
      { x: 84, y: 468, w: 792, h: 24 },
      { x: 256, y: 132, w: 24, h: 290 },
      { x: 514, y: 132, w: 24, h: 290 },
      { x: 688, y: 132, w: 24, h: 290 }
    ],
    furniture: [
      { x: 134, y: 118, w: 74, h: 306, label: "本棚" },
      { x: 312, y: 132, w: 128, h: 44, label: "資料箱" }
    ],
    objects: [
      memory("file", "捜査資料", 366, 154, "資料には『連続失踪事件』とある。被害者の数は、記憶の欠片より多い。"),
      item("basementKey", "地下の鍵", 760, 398, "地下の鍵を拾った。古い鉄の匂いが指に残る。"),
      memory("name", "名札", 604, 280, "名札にはかすれた文字。『し……』。それ以上は読めない。でも、その響きはひどく懐かしい。")
    ]
  },
  cell: {
    name: "隔離室",
    tint: "#201019",
    exits: [
      { x: 426, y: 78, w: 112, h: 28, to: "office", spawn: { x: 480, y: 430 }, label: "管理室" }
    ],
    walls: [
      { x: 84, y: 78, w: 342, h: 24 },
      { x: 538, y: 78, w: 338, h: 24 },
      { x: 84, y: 78, w: 24, h: 390 },
      { x: 852, y: 78, w: 24, h: 390 },
      { x: 84, y: 468, w: 792, h: 24 },
      { x: 318, y: 220, w: 318, h: 22 }
    ],
    furniture: [
      { x: 146, y: 124, w: 150, h: 66, label: "拘束台" },
      { x: 660, y: 340, w: 128, h: 58, label: "監視装置" }
    ],
    objects: [
      memory("music", "止まったオルゴール", 190, 152, "音のない旋律を聞いた瞬間、胸が痛んだ。誰かに約束した。ここから出ると。"),
      memory("crime", "血のついた記録", 704, 366, "『犯人は被害者の声を録音していた』。読んだ瞬間、機械の使い方を思い出してしまった。")
    ]
  },
  basement: {
    name: "地下室",
    tint: "#130d12",
    exits: [
      { x: 426, y: 468, w: 112, h: 28, to: "archive", spawn: { x: 480, y: 130 }, label: "資料室" },
      { x: 426, y: 78, w: 112, h: 28, to: "exit", spawn: { x: 480, y: 430 }, label: "出口", requires: requiredItems, final: true }
    ],
    walls: [
      { x: 84, y: 78, w: 342, h: 24 },
      { x: 538, y: 78, w: 338, h: 24 },
      { x: 84, y: 78, w: 24, h: 390 },
      { x: 852, y: 78, w: 24, h: 390 },
      { x: 84, y: 468, w: 342, h: 24 },
      { x: 538, y: 468, w: 338, h: 24 },
      { x: 236, y: 300, w: 492, h: 20 }
    ],
    furniture: [
      { x: 148, y: 122, w: 172, h: 78, label: "焼却炉" },
      { x: 650, y: 128, w: 144, h: 72, label: "古い扉" }
    ],
    objects: [
      memory("truth", "最後の記録", 480, 252, "記録の最後に自分の顔写真が貼られている。肩書きは患者ではない。『凶悪犯罪者』。")
    ]
  }
};

function memory(id, label, x, y, text) {
  return { type: "memory", id, label, x, y, text };
}

function item(id, label, x, y, text) {
  return { type: "item", id, label, x, y, text };
}

requestAnimationFrame(loop);

startButton.addEventListener("click", restart);
inspectButton.addEventListener("click", inspect);

window.addEventListener("keydown", (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === " ") {
    inspect();
    return;
  }

  keys.add(normalizeKey(event.key));
});

window.addEventListener("keyup", (event) => {
  keys.delete(normalizeKey(event.key));
});

controlButtons.forEach((button) => {
  const key = button.dataset.key;

  button.addEventListener("pointerdown", () => {
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

function restart() {
  phase = "play";
  currentRoomId = "ward";
  player.x = rooms.ward.start.x;
  player.y = rooms.ward.start.y;
  player.step = 0;
  inventory.clear();
  foundMemories.clear();
  activeText = null;
  endingShown = false;
  message = "目を覚ました。自分が誰かも分からない。脱出するには、記憶と道具を集めるしかない。";
  messageTimer = 4.5;
  startButton.textContent = "最初から";
  updateHud();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);
  lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (phase === "play" && !activeText && !endingShown) {
    movePlayer(dt);
  }

  if (messageTimer > 0) {
    messageTimer -= dt;
  }

  updateHud();
}

function movePlayer(dt) {
  const speed = 204;
  let dx = 0;
  let dy = 0;

  if (keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("ArrowRight")) dx += 1;
  if (keys.has("ArrowUp")) dy -= 1;
  if (keys.has("ArrowDown")) dy += 1;

  if (dx === 0 && dy === 0) {
    return;
  }

  const length = Math.hypot(dx, dy);
  const next = {
    x: player.x + (dx / length) * speed * dt,
    y: player.y + (dy / length) * speed * dt,
    radius: player.radius
  };

  const room = rooms[currentRoomId];
  const exit = room.exits.find((candidate) => circleHitsRect(next, candidate));
  if (exit) {
    useExit(exit);
    return;
  }

  if (!room.walls.some((wall) => circleHitsRect(next, wall))) {
    player.x = next.x;
    player.y = next.y;
    player.step += dt * 8;
  }
}

function useExit(exit) {
  if (exit.requires && !exit.requires.every((itemName) => inventory.has(itemName))) {
    const missing = exit.requires.filter((itemName) => !inventory.has(itemName)).join("、");
    message = `扉は開かない。必要なもの: ${missing}`;
    messageTimer = 3;
    return;
  }

  if (exit.final) {
    endingShown = true;
    activeText = null;
    return;
  }

  currentRoomId = exit.to;
  player.x = exit.spawn.x;
  player.y = exit.spawn.y;
  message = `${rooms[currentRoomId].name}に入った。`;
  messageTimer = 2;
}

function inspect() {
  if (phase === "title") {
    restart();
    return;
  }

  if (endingShown) {
    endingShown = false;
    phase = "title";
    startButton.textContent = "始める";
    return;
  }

  if (activeText) {
    activeText = null;
    return;
  }

  const exit = getNearestExit();
  if (exit && distance(player, centerOf(exit)) <= 64) {
    useExit(exit);
    return;
  }

  const object = getNearestObject();
  if (!object || distance(player, object) > 58) {
    message = "何もない。けれど、この部屋にはまだ何かが残っている気がする。";
    messageTimer = 2.4;
    return;
  }

  if (object.type === "memory") {
    foundMemories.add(object.id);
    activeText = {
      title: object.label,
      body: object.text
    };
    return;
  }

  inventory.add(object.label);
  activeText = {
    title: object.label,
    body: object.text
  };
}

function updateHud() {
  const room = rooms[currentRoomId];
  memoryCountEl.textContent = `${foundMemories.size} / ${getAllMemories().length}  Items ${inventory.size} / ${requiredItems.length}`;
  nearTextEl.textContent = phase === "play" ? room.name : "---";
}

function draw() {
  drawRoom();

  if (phase === "title") {
    drawTitle();
    return;
  }

  drawExits();
  drawObjects();
  drawPlayer();
  drawDarkness();

  if (activeText) {
    drawTextBox(activeText.title, activeText.body);
  } else if (endingShown) {
    drawEnding();
  } else if (messageTimer > 0) {
    drawMessage(message);
  } else {
    drawHint();
  }
}

function drawRoom() {
  const room = rooms[currentRoomId];
  ctx.fillStyle = "#07080c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const floor = ctx.createLinearGradient(0, 84, 0, canvas.height);
  floor.addColorStop(0, room.tint);
  floor.addColorStop(1, "#07080c");
  ctx.fillStyle = floor;
  ctx.fillRect(84, 78, 792, 414);

  ctx.strokeStyle = "rgba(96, 106, 137, 0.17)";
  ctx.lineWidth = 2;
  for (let x = 110; x < 860; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 78);
    ctx.lineTo(x, 492);
    ctx.stroke();
  }
  for (let y = 110; y < 492; y += 48) {
    ctx.beginPath();
    ctx.moveTo(84, y);
    ctx.lineTo(876, y);
    ctx.stroke();
  }

  room.walls.forEach((wall) => drawWall(wall));
  room.furniture.forEach((piece) => drawFurniture(piece));

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(room.name, 106, 58);
}

function drawWall(wall) {
  ctx.fillStyle = "#202435";
  ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(wall.x, wall.y, wall.w, 3);
}

function drawFurniture(piece) {
  ctx.fillStyle = "#11131d";
  ctx.strokeStyle = "#31364a";
  ctx.lineWidth = 3;
  ctx.fillRect(piece.x, piece.y, piece.w, piece.h);
  ctx.strokeRect(piece.x, piece.y, piece.w, piece.h);
  ctx.fillStyle = "rgba(198, 208, 225, 0.38)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(piece.label, piece.x + piece.w / 2, piece.y + piece.h / 2 + 4);
}

function drawExits() {
  const room = rooms[currentRoomId];
  room.exits.forEach((exit) => {
    const locked = exit.requires && !exit.requires.every((itemName) => inventory.has(itemName));
    ctx.fillStyle = locked ? "#341520" : "#1f3a2b";
    ctx.strokeStyle = locked ? "#9b1c31" : "#45a36f";
    ctx.lineWidth = 3;
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  });
}

function drawObjects() {
  getRoomObjects().forEach((object) => {
    if (object.type === "memory" && foundMemories.has(object.id)) {
      return;
    }

    if (object.type === "item" && inventory.has(object.label)) {
      return;
    }

    const pulse = Math.sin(performance.now() / 280 + object.x) * 3;
    ctx.save();
    ctx.translate(object.x, object.y + pulse);

    if (object.type === "memory") {
      ctx.fillStyle = "#d9e4ff";
      ctx.shadowColor = "#b9ccff";
    } else {
      ctx.fillStyle = "#f7c948";
      ctx.shadowColor = "#f7c948";
    }

    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, object.type === "memory" ? 11 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlayer() {
  const bob = Math.sin(player.step) * 3;
  ctx.save();
  ctx.translate(player.x, player.y + bob);

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.ellipse(0, 24, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#cfd8e3";
  ctx.beginPath();
  ctx.roundRect(-18, -6, 36, 42, 10);
  ctx.fill();

  ctx.fillStyle = "#e6edf6";
  ctx.beginPath();
  ctx.arc(0, -22, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#202230";
  ctx.beginPath();
  ctx.arc(-6, -24, 3, 0, Math.PI * 2);
  ctx.arc(6, -24, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#202230";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-5, -15);
  ctx.lineTo(5, -15);
  ctx.stroke();

  ctx.restore();
}

function drawDarkness() {
  const memoryPressure = foundMemories.size * 0.018;
  const gradient = ctx.createRadialGradient(player.x, player.y, 42, player.x, player.y, 360);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.52, `rgba(0, 0, 0, ${0.30 + memoryPressure})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.88)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = `rgba(80, 0, 24, ${0.07 + memoryPressure})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTitle() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPanel(172, 100, 616, 330);

  ctx.fillStyle = "#edf2f7";
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("記憶の欠片", canvas.width / 2, 176);

  ctx.fillStyle = "#b7c0cf";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("気が付くと、自分が誰なのかさえ思い出せなかった。", canvas.width / 2, 236);
  ctx.fillText("部屋を渡り、記憶と脱出アイテムを集める。", canvas.width / 2, 272);
  ctx.fillText("出口の先で、本当の過去を知る。", canvas.width / 2, 308);

  ctx.fillStyle = "#d53f5b";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText("始める / Space", canvas.width / 2, 370);
}

function drawHint() {
  const nearestObject = getNearestObject();
  const nearestExit = getNearestExit();
  if (nearestObject && distance(player, nearestObject) <= 58) {
    drawMessage(`${nearestObject.label}を調べる。`);
    return;
  }
  if (nearestExit && distance(player, centerOf(nearestExit)) <= 64) {
    drawMessage(`${nearestExit.label}へ進む。`);
    return;
  }
  drawMessage("部屋を探索し、光る記憶と黄色いアイテムを集める。");
}

function drawMessage(text) {
  drawPanel(86, canvas.height - 98, canvas.width - 172, 66);
  ctx.fillStyle = "#edf2f7";
  ctx.font = "19px system-ui, sans-serif";
  ctx.textAlign = "center";
  fitText(text, canvas.width / 2, canvas.height - 58, canvas.width - 220, 19);
}

function drawTextBox(title, body) {
  drawPanel(96, 328, 768, 150);
  ctx.fillStyle = "#d53f5b";
  ctx.font = "bold 23px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, 128, 370);

  ctx.fillStyle = "#edf2f7";
  wrapText(body, 128, 410, 704, 25, 19);

  ctx.fillStyle = "#8d99aa";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Space / 調べる", 832, 456);
}

function drawEnding() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawPanel(132, 90, 696, 360);

  ctx.fillStyle = "#edf2f7";
  ctx.font = "bold 34px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("出口の向こう", canvas.width / 2, 158);

  ctx.fillStyle = "#b7c0cf";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("外へ出た瞬間、記憶が戻る。", canvas.width / 2, 214);
  ctx.fillText("逃げていたのは、閉じ込められた被害者ではなかった。", canvas.width / 2, 252);
  ctx.fillText("あなたは、連続失踪事件の凶悪犯罪者だった。", canvas.width / 2, 290);

  ctx.fillStyle = "#d53f5b";
  ctx.font = "bold 21px system-ui, sans-serif";
  ctx.fillText("忘却は罰ではなく、最後の鍵だった。", canvas.width / 2, 348);
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("調べるでタイトルへ戻る", canvas.width / 2, 398);
}

function drawPanel(x, y, w, h) {
  ctx.fillStyle = "rgba(17, 20, 29, 0.94)";
  ctx.strokeStyle = "#3b4358";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function getRoomObjects() {
  return rooms[currentRoomId].objects;
}

function getAllMemories() {
  return Object.values(rooms).flatMap((room) => room.objects.filter((object) => object.type === "memory"));
}

function getNearestObject() {
  return getRoomObjects().reduce((nearest, object) => {
    if (object.type === "memory" && foundMemories.has(object.id)) {
      return nearest;
    }
    if (object.type === "item" && inventory.has(object.label)) {
      return nearest;
    }
    if (!nearest) {
      return object;
    }
    return distance(player, object) < distance(player, nearest) ? object : nearest;
  }, null);
}

function getNearestExit() {
  return rooms[currentRoomId].exits.reduce((nearest, exit) => {
    if (!nearest) {
      return exit;
    }
    return distance(player, centerOf(exit)) < distance(player, centerOf(nearest)) ? exit : nearest;
  }, null);
}

function centerOf(rect) {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2
  };
}

function fitText(text, x, y, maxWidth, size) {
  ctx.font = `${size}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 1;
    ctx.font = `${size}px system-ui, sans-serif`;
  }
  ctx.fillText(text, x, y);
}

function wrapText(text, x, y, maxWidth, lineHeight, size) {
  ctx.font = `${size}px system-ui, sans-serif`;
  let line = "";
  let currentY = y;

  for (const char of text) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, currentY);
  }
}

function circleHitsRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  return Math.hypot(circle.x - closestX, circle.y - closestY) < circle.radius;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
