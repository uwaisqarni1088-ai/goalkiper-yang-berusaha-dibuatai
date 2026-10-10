import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const levels = {
  easy: { label: 'Easy', shotSpeed: 15, saveWindow: 2.0, attackInterval: 2.2 },
  medium: { label: 'Medium', shotSpeed: 18, saveWindow: 1.7, attackInterval: 1.8 },
  hard: { label: 'Hard', shotSpeed: 21, saveWindow: 1.35, attackInterval: 1.5 }
};

const state = {
  level: 'medium',
  started: false,
  score: { home: 0, away: 0 },
  time: 90,
  lastTime: 0,
  roundCooldown: 0,
  message: document.getElementById('message'),
  scoreEl: document.getElementById('score'),
  timerEl: document.getElementById('timer'),
  levelEl: document.getElementById('level'),
  menu: document.getElementById('menu'),
  leftDive: document.getElementById('leftDive'),
  rightDive: document.getElementById('rightDive'),
  analog: document.getElementById('analog'),
  startBtn: document.getElementById('start-game'),
  goalKeeper: null,
  ball: null,
  attack: {
    active: false,
    target: new THREE.Vector3(),
    performer: null,
    timer: 0,
  },
  homePlayers: [],
  awayPlayers: [],
  formation: {
    home: [
      { x: 0, z: 14.5, role: 'GK' },
      { x: -7.5, z: 11, role: 'LB' },
      { x: -2.5, z: 11, role: 'CB' },
      { x: 2.5, z: 11, role: 'CB' },
      { x: 7.5, z: 11, role: 'RB' },
      { x: -7.5, z: 6.2, role: 'LM' },
      { x: 7.5, z: 6.2, role: 'RM' },
      { x: -4, z: 2.4, role: 'LW' },
      { x: 4, z: 2.4, role: 'RW' },
      { x: -2, z: -1.8, role: 'ST' },
      { x: 2, z: -1.8, role: 'ST' }
    ],
    away: [
      { x: 0, z: -14.5, role: 'GK' },
      { x: -7.5, z: -11, role: 'LB' },
      { x: -2.5, z: -11, role: 'CB' },
      { x: 2.5, z: -11, role: 'CB' },
      { x: 7.5, z: -11, role: 'RB' },
      { x: -7.5, z: -6.2, role: 'LM' },
      { x: 7.5, z: -6.2, role: 'RM' },
      { x: -4, z: -2.4, role: 'LW' },
      { x: 4, z: -2.4, role: 'RW' },
      { x: -2, z: 1.8, role: 'ST' },
      { x: 2, z: 1.8, role: 'ST' }
    ]
  }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071d16);
scene.fog = new THREE.Fog(0x071d16, 28, 65);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 20, 28);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

function createPlayer(color, role) {
  const group = new THREE.Group();

  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.8, 16), bodyMaterial);
  body.position.y = 1.15;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 18, 18),
    new THREE.MeshStandardMaterial({ color: 0xf2d7b1, roughness: 0.9 })
  );
  head.position.y = 2.45;

  const kit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
  );
  kit.position.y = 1.8;

  group.add(body);
  group.add(head);
  group.add(kit);

  group.userData = { role };
  return group;
}

function createBall() {
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 20, 20),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8, metalness: 0.15 })
  );
  ball.position.set(0, 0.4, 0);
  scene.add(ball);
  return ball;
}

function addPitch() {
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(34, 0.3, 22),
    new THREE.MeshStandardMaterial({ color: 0x0f8a49, roughness: 1 })
  );
  grass.position.y = -0.2;
  scene.add(grass);

  const pitchLines = new THREE.Group();
  const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x1a1a1a });

  const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.01, 22), lineMaterial);
  centerLine.position.set(0, 0.15, 0);
  pitchLines.add(centerLine);

  const centerCircle = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  centerCircle.rotation.x = -Math.PI / 2;
  centerCircle.position.y = 0.16;
  pitchLines.add(centerCircle);

  const leftGoalArea = new THREE.Mesh(new THREE.BoxGeometry(12, 0.01, 5.8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  leftGoalArea.position.set(0, 0.18, 14.8);
  leftGoalArea.rotation.x = -Math.PI / 2;
  pitchLines.add(leftGoalArea);

  const rightGoalArea = leftGoalArea.clone();
  rightGoalArea.position.z = -14.8;
  pitchLines.add(rightGoalArea);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 21), lineMaterial);
  box.position.set(0, 0.15, 0);
  pitchLines.add(box);

  const leftGoalFrame = new THREE.Group();
  leftGoalFrame.position.set(0, 0, 15.8);
  const leftPostLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.24), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
  leftPostLeft.position.set(-5.2, 1.1, 0);
  const leftPostRight = leftPostLeft.clone();
  leftPostRight.position.x = 5.2;
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
  crossBar.position.set(0, 2.3, 0);
  leftGoalFrame.add(leftPostLeft, leftPostRight, crossBar);
  scene.add(leftGoalFrame);

  const rightGoalFrame = leftGoalFrame.clone();
  rightGoalFrame.position.z = -15.8;
  scene.add(rightGoalFrame);

  scene.add(pitchLines);

  const stadiumLight = new THREE.DirectionalLight(0xffffff, 1.1);
  stadiumLight.position.set(10, 25, 12);
  scene.add(stadiumLight);

  const fillLight = new THREE.HemisphereLight(0xbfe6ff, 0x0f2f20, 0.9);
  scene.add(fillLight);
}

function buildTeam(side, formation, color) {
  const players = [];

  formation.forEach((slot, index) => {
    const player = createPlayer(color, slot.role);
    player.position.set(slot.x, 0, side === 'home' ? slot.z : -slot.z);
    player.userData.baseX = slot.x;
    player.userData.baseZ = side === 'home' ? slot.z : -slot.z;
    player.userData.team = side;
    player.userData.index = index;
    scene.add(player);
    players.push(player);
  });

  return players;
}

function setupField() {
  addPitch();
  const homePlayers = buildTeam('home', state.formation.home, 0x22c55e);
  const awayPlayers = buildTeam('away', state.formation.away, 0xf43f5e);

  state.homePlayers = homePlayers;
  state.awayPlayers = awayPlayers;

  const goalie = createPlayer(0x60a5fa, 'GK');
  goalie.position.set(0, 0, 14.5);
  scene.add(goalie);
  state.goalKeeper = goalie;

  state.ball = createBall();
  state.ball.userData = { radius: 0.38 };

  updateScoreboard();
}

function chooseShoter() {
  return state.awayPlayers[Math.floor(Math.random() * state.awayPlayers.length)];
}

function resetBall() {
  state.ball.position.set(0, 0.42, 0);
  state.ball.velocity = new THREE.Vector3();
  state.attack.active = false;
  state.roundCooldown = 0.6;
}

function kickBallTowardGoal() {
  const shooter = chooseShoter();
  const targetX = THREE.MathUtils.randFloatSpread(7.8);
  const direction = new THREE.Vector3(targetX - shooter.position.x, 0.2, 16 - shooter.position.z);
  direction.normalize();

  const config = levels[state.level];
  const shotPower = config.shotSpeed;
  state.ball.position.set(shooter.position.x, 0.42, shooter.position.z);
  state.ball.velocity.copy(direction.multiplyScalar(shotPower));
  state.attack.active = true;
  state.attack.performer = shooter;
  state.attack.target.set(targetX, 0.4, 16);
  state.attack.timer = 0;

  state.message.textContent = 'Serangan! Kiper harus menutup jalur!';
}

function setLevel(level) {
  state.level = level;
  document.querySelectorAll('.level-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
  state.levelEl.textContent = levels[level].label;
  state.message.textContent = `${levels[level].label} level dipilih.`;
}

function startMatch() {
  state.started = true;
  state.score.home = 0;
  state.score.away = 0;
  state.time = 90;
  state.roundCooldown = 0.4;
  state.menu.classList.remove('visible');
  state.message.textContent = 'Pertandingan dimulai. Jaga gawangmu!';
  updateScoreboard();
  resetGoalie();
  resetBall();
}

function resetGoalie() {
  state.goalKeeper.position.x = 0;
  state.goalKeeper.position.z = 14.5;
  state.goalKeeper.userData.dive = 0;
  state.goalKeeper.userData.diveTimer = 0;
}

function updateScoreboard() {
  state.scoreEl.textContent = `${state.score.home} - ${state.score.away}`;
  state.timerEl.textContent = Math.ceil(state.time).toString();
  state.levelEl.textContent = levels[state.level].label;
}

function handleDive(direction) {
  if (!state.started) return;
  const config = levels[state.level];
  const diveStrength = config.saveWindow * 0.95;
  const move = direction === 'left' ? -2.8 : 2.8;

  state.goalKeeper.userData.dive = direction === 'left' ? -1 : 1;
  state.goalKeeper.userData.diveTimer = 0.55;
  state.goalKeeper.position.x = THREE.MathUtils.clamp(state.goalKeeper.position.x + move, -5.6, 5.6);

  const targetX = state.goalKeeper.position.x;
  const goalWindow = Math.abs(state.ball.position.x - targetX) < diveStrength;
  const nearGoal = state.ball.position.z > 12 && state.ball.position.z < 17;

  if (goalWindow && nearGoal && state.attack.active) {
    state.message.textContent = 'SAVE! Bola berhasil ditangkap!';
    state.ball.velocity.multiplyScalar(-0.22);
    state.roundCooldown = 0.9;
    state.attack.active = false;
  }
}

function updateGoalie(dt) {
  const sliderValue = Number(state.analog.value);
  const targetX = THREE.MathUtils.mapLinear(sliderValue, 0, 100, -5.6, 5.6);
  const goalie = state.goalKeeper;

  goalie.position.x = THREE.MathUtils.lerp(goalie.position.x, targetX, 0.18);

  if (goalie.userData.diveTimer > 0) {
    goalie.userData.diveTimer -= dt;
    goalie.position.x += (goalie.userData.dive || 0) * 1.6 * dt * 10;
    goalie.position.x = THREE.MathUtils.clamp(goalie.position.x, -5.8, 5.8);
  }

  goalie.position.y = 0.18 + Math.sin(performance.now() * 0.012) * 0.04;
  goalie.rotation.y = THREE.MathUtils.lerp(goalie.rotation.y, (targetX - goalie.position.x) * 0.14, 0.2);
}

function updateHomePlayers(dt) {
  state.homePlayers.forEach((player, index) => {
    if (index === 0) return;
    const base = state.formation.home[index];
    const xTarget = base.x;
    const zTarget = base.z + Math.sin((performance.now() * 0.0007) + index) * 0.2;
    player.position.x = THREE.MathUtils.lerp(player.position.x, xTarget, 0.08 + dt * 0.15);
    player.position.z = THREE.MathUtils.lerp(player.position.z, zTarget, 0.08 + dt * 0.15);
  });
}

function updateAwayPlayers(dt) {
  state.awayPlayers.forEach((player, index) => {
    const base = state.formation.away[index];
    const influence = state.attack.active ? 0.22 : 0.12;
    const xTarget = base.x + (Math.random() - 0.5) * 0.18;
    const zTarget = -base.z + Math.sin((performance.now() * 0.0009) + index) * 0.5;
    player.position.x = THREE.MathUtils.lerp(player.position.x, xTarget, influence * dt * 12);
    player.position.z = THREE.MathUtils.lerp(player.position.z, zTarget, influence * dt * 12);
  });
}

function updateBall(dt) {
  if (!state.attack.active) {
    return;
  }

  state.ball.position.addScaledVector(state.ball.velocity, dt);
  state.ball.position.y = 0.42 + Math.sin(performance.now() * 0.015) * 0.075;
  state.ball.rotation.x += dt * 5;
  state.ball.rotation.z += dt * 6;

  const goalXWindow = 5.5;
  const isGoalArea = state.ball.position.z > 14.2 && state.ball.position.z < 17 && Math.abs(state.ball.position.x) < goalXWindow;

  if (isGoalArea) {
    const goalieX = state.goalKeeper.position.x;
    const saveWindow = levels[state.level].saveWindow;
    const almostSaved = Math.abs(state.ball.position.x - goalieX) < saveWindow;

    if (almostSaved) {
      state.attack.active = false;
      state.ball.velocity.multiplyScalar(-0.25);
      state.roundCooldown = 0.9;
      state.message.textContent = 'SAVE! Bola diselamatkan!';
      return;
    }

    state.score.home += 1;
    state.message.textContent = 'GOAL! Tim lawan mencetak gol.';
    state.attack.active = false;
    state.roundCooldown = 1.5;
    updateScoreboard();
    return;
  }

  if (state.ball.position.z > 18 || state.ball.position.z < -18 || Math.abs(state.ball.position.x) > 16) {
    state.attack.active = false;
    state.message.textContent = 'Bola keluar / melebar. Serangan baru siap!';
    state.roundCooldown = 0.8;
  }
}

function updateMatch(dt) {
  if (!state.started) return;

  state.time -= dt;
  if (state.time <= 0) {
    state.time = 0;
    state.message.textContent = 'Waktu habis! Pertandingan selesai.';
    state.started = false;
    state.menu.classList.add('visible');
  }

  updateScoreboard();

  if (state.roundCooldown > 0) {
    state.roundCooldown -= dt;
    if (state.roundCooldown <= 0) {
      kickBallTowardGoal();
    }
    return;
  }

  if (!state.attack.active) {
    state.roundCooldown = levels[state.level].attackInterval;
    return;
  }

  updateBall(dt);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);

  updateGoalie(dt);
  updateHomePlayers(dt);
  updateAwayPlayers(dt);
  updateMatch(dt);

  renderer.render(scene, camera);
}

setupField();
setLevel('medium');

state.leftDive.addEventListener('click', () => handleDive('left'));
state.rightDive.addEventListener('click', () => handleDive('right'));
state.startBtn.addEventListener('click', startMatch);
document.querySelectorAll('.level-btn').forEach((btn) => {
  btn.addEventListener('click', () => setLevel(btn.dataset.level));
});

renderer.setAnimationLoop(animate);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') handleDive('left');
  if (event.key === 'ArrowRight') handleDive('right');
  if (event.key === ' ') {
    if (!state.started) startMatch();
  }
});
