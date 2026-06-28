// ── SOUND ────────────────────────────────────────────────
// Files live in assets/sounds/ — missing files fail silently.
const sfx = {
  chomp:   new Audio('assets/sounds/chomp.wav'),
  spin:    new Audio('assets/sounds/spin.wav'),
  ambient: new Audio('assets/sounds/ambient.wav'),
};
sfx.ambient.loop   = true;
sfx.ambient.volume = 0.35;
sfx.chomp.volume   = 0.8;
sfx.spin.volume    = 0.6;

// play a one-shot from the start; swallow autoplay/missing-file errors
function playSfx(name) {
  const a = sfx[name];
  if (!a) return;
  try { a.currentTime = 0; } catch (_) {}
  a.play().catch(() => {});
}

// ── LANDING ──────────────────────────────────────────────
const popup     = document.getElementById('popup');
const okBtn     = document.getElementById('ok-btn');
const mouthTop  = document.getElementById('mouth-top');
const mouthBot  = document.getElementById('mouth-bottom');
const voidEl    = document.getElementById('void');

popup.addEventListener('animationend', () => okBtn.focus());
okBtn.addEventListener('click', eat);
okBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') eat(); });

function eat() {
  playSfx('chomp');
  popup.classList.add('hiding');
  popup.addEventListener('animationend', () => popup.style.display = 'none', { once: true });
  mouthTop.classList.add('split');
  mouthBot.classList.add('split');
  setTimeout(() => {
    voidEl.classList.add('open');
    // ambient drone for the alien/Virgil page (this click is the user gesture)
    sfx.ambient.play().catch(() => {});
  }, 400);
}

// ── SKULL TRIGGER ────────────────────────────────────────
const skullBtn     = document.getElementById('skull-trigger');
const spinnerPopup = document.getElementById('spinner-popup');
const spinBtn      = document.getElementById('spin-btn');
const roomTwo      = document.getElementById('room-two');

skullBtn.addEventListener('click', () => {
  spinnerPopup.classList.add('visible');
  drawWheel(currentAngle);
});

// ── WHEEL ────────────────────────────────────────────────
const canvas  = document.getElementById('wheel-canvas');
const ctx     = canvas.getContext('2d');
const SEGMENTS = 12;
const SLICE    = (2 * Math.PI) / SEGMENTS;

// muted analog palette cycling across 12 segments
const COLORS = [
  '#c8b89a', '#9ab0c4', '#b8a090', '#8fa89a',
  '#c4a882', '#a09ab0', '#b0c4a0', '#c4a0a0',
  '#a0b4c8', '#c8c0a0', '#a8b898', '#b0a8c0',
];

let currentAngle = 0;
let spinning     = false;
let rafId        = null;

function drawWheel(angle) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r  = cx - 4;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < SEGMENTS; i++) {
    const start = angle + i * SLICE;
    const end   = start + SLICE;

    // slice fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    // slice border
    ctx.strokeStyle = '#2a1a1a';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + SLICE / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#1a1512';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.letterSpacing = '0.05em';
    ctx.fillText('enter', r - 10, 4);
    ctx.restore();
  }

  // center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, 2 * Math.PI);
  ctx.fillStyle = '#2a1a1a';
  ctx.fill();
}

drawWheel(0);

spinBtn.addEventListener('click', () => {
  if (spinning) return;
  spinning = true;
  spinBtn.disabled = true;
  spinBtn.textContent = '...';
  playSfx('spin');

  // random extra rotations (8-14 full turns) + random landing offset
  const extraRotation = (8 + Math.random() * 6) * 2 * Math.PI;
  const target = currentAngle + extraRotation;
  const duration = 3800 + Math.random() * 800; // ms
  const start = performance.now();
  const startAngle = currentAngle;

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    currentAngle = startAngle + (target - startAngle) * easeOut(t);
    drawWheel(currentAngle);

    if (t < 1) {
      rafId = requestAnimationFrame(frame);
    } else {
      spinning = false;
      // stop the spin sound in sync with the wheel landing
      sfx.spin.pause();
      // brief pause then enter room two
      setTimeout(enterRoomTwo, 900);
    }
  }

  rafId = requestAnimationFrame(frame);
});

function enterRoomTwo() {
  // fade out the alien-page ambient drone
  const fade = setInterval(() => {
    if (sfx.ambient.volume > 0.04) {
      sfx.ambient.volume -= 0.04;
    } else {
      sfx.ambient.pause();
      clearInterval(fade);
    }
  }, 60);

  spinnerPopup.classList.add('hiding');
  spinnerPopup.addEventListener('animationend', () => {
    spinnerPopup.style.display = 'none';
  }, { once: true });

  roomTwo.classList.add('open');
}

// ── TV CLICKS → DEEP ROOMS ────────────────────────────────
document.querySelectorAll('.tv-set').forEach(tv => {
  tv.addEventListener('click', () => {
    const roomId = 'room-' + tv.dataset.room;
    const target = document.getElementById(roomId);
    if (target) target.classList.add('open');
  });
});
