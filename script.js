const playArea = document.getElementById("playArea");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const question = document.getElementById("question");
const result = document.getElementById("result");

const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");

let yesScale = 1;
let dodges = 0;

// --- Helpers ---
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
  confettiCanvas.style.width = `${window.innerWidth}px`;
  confettiCanvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", setCanvasSize);
setCanvasSize();

// --- Position "No" initially ---
function initNoPosition() {
  noBtn.style.left = "62%";
  noBtn.style.top = "62%";
}
window.addEventListener("load", initNoPosition);
window.addEventListener("resize", initNoPosition);

// --- Make No run away ---
function moveNoButtonAwayFrom(pointerX, pointerY) {
  const areaRect = playArea.getBoundingClientRect();
  const btnRect = noBtn.getBoundingClientRect();

  // pick a new random spot in the play area
  const padding = 8;
  const maxX = areaRect.width - btnRect.width - padding;
  const maxY = areaRect.height - btnRect.height - padding;

  // bias away from cursor: try a few times to find a far position
  let best = null;
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * maxX + padding / 2;
    const y = Math.random() * maxY + padding / 2;

    const absX = areaRect.left + x + btnRect.width / 2;
    const absY = areaRect.top + y + btnRect.height / 2;

    const dx = absX - pointerX;
    const dy = absY - pointerY;
    const dist2 = dx * dx + dy * dy;

    if (!best || dist2 > best.dist2) best = { x, y, dist2 };
  }

  if (best) {
    noBtn.style.left = `${clamp(best.x, padding, maxX)}px`;
    noBtn.style.top = `${clamp(best.y, padding, maxY)}px`;
  }

  // grow Yes a bit each dodge
  dodges += 1;
  yesScale = Math.min(yesScale + 0.12, 2.35);
  yesBtn.style.transform = `scale(${yesScale})`;

  // fun escalating text (optional)
  if (dodges === 3) question.textContent = "Uhhh sweetness ur supposed to click yes😅";
  if (dodges === 6) question.textContent = "Okay cmon do u wanna go La Cappola or not🤨";
  if (dodges === 9) question.textContent = "Last chance… YES????????";
}

// Dodge radius: when cursor gets within this many pixels, No runs
const DODGE_RADIUS = 90;

function handlePointerMove(clientX, clientY) {
  const btnRect = noBtn.getBoundingClientRect();
  const bx = btnRect.left + btnRect.width / 2;
  const by = btnRect.top + btnRect.height / 2;

  const dx = bx - clientX;
  const dy = by - clientY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < DODGE_RADIUS) {
    moveNoButtonAwayFrom(clientX, clientY);
  }
}

// Desktop: dodge cursor as it approaches
playArea.addEventListener("mousemove", (e) => {
  handlePointerMove(e.clientX, e.clientY);
});

// Mobile: dodge finger
playArea.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  if (!t) return;
  handlePointerMove(t.clientX, t.clientY);
}, { passive: true });

// Also dodge if they somehow click it
noBtn.addEventListener("click", (e) => {
  e.preventDefault();
  moveNoButtonAwayFrom(e.clientX, e.clientY);
});

// --- Confetti (simple particle burst) ---
let particles = [];
let animId = null;

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function spawnConfettiBurst(count = 180) {
  const colors = [
    "#ff4d6d", "#c9184a", "#ff758f", "#ffd166",
    "#06d6a0", "#4ea8de", "#9b5de5", "#f15bb5"
  ];

  const originX = window.innerWidth / 2;
  const originY = window.innerHeight / 3;

  particles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;

    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      size: 4 + Math.random() * 6,
      color: randomChoice(colors),
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 0,
      ttl: 140 + Math.floor(Math.random() * 60),
      shape: Math.random() < 0.15 ? "circle" : "rect"
    });
  }
}

function drawConfettiFrame() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // gravity + drag
  const g = 0.18;
  const drag = 0.992;

  for (const p of particles) {
    p.life += 1;
    p.vx *= drag;
    p.vy = p.vy * drag + g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;

    const alpha = 1 - p.life / p.ttl;
    ctx.globalAlpha = clamp(alpha, 0, 1);

    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
    }

    ctx.restore();
  }

  particles = particles.filter((p) => p.life < p.ttl && p.y < window.innerHeight + 40);

  if (particles.length > 0) {
    animId = requestAnimationFrame(drawConfettiFrame);
  } else {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    cancelAnimationFrame(animId);
    animId = null;
  }
}

function startConfetti() {
  spawnConfettiBurst();
  if (!animId) drawConfettiFrame();
}

// --- Yes click ---
function showSuccess() {
  yesBtn.disabled = true;
  noBtn.disabled = true;
  playArea.style.display = "none";
  result.classList.remove("hidden");
  startConfetti();
}

yesBtn.addEventListener("click", showSuccess);
