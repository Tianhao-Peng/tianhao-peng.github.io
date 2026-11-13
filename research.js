const stateCenters = [318, 630, 942];
const reasoningStates = [
  [0, 0.42, 0, 1, 0, 0, 0.42, 0, 0],
  [0, 0.42, 0, 1, 1, 0, 0, 0.42, 0.42],
  [0, 0.42, 0, 1, 1, 1, 0, 0, 0.42],
];
const initialState = [0.52, 0.19, 0.38, 0.21, 0.55, 0.29, 0.33, 0.47, 0.20];
const stateTimes = [410, 1580, 2750];
const reasoningDuration = 5600;
const robotDuration = 5250;
const fullTurn = Math.PI * 2;
const robotOutline = "#244252";
const robotJoint = "#d8e6df";
const flowColor = "#3f7060";
const observationColor = "#a46b39";
const robotBranches = [
  [[200, 157], [200, 53], [800, 53], [800, 10]],
  [[600, 138], [600, 53], [800, 53], [800, 10]],
  [[1000, 114], [1000, 53], [800, 53], [800, 10]],
  [[1400, 114], [1400, 53], [800, 53], [800, 10]],
];
const assignmentRoutes = robotBranches.map((path) => [...path].reverse());
// Hip, resting foot, bend, and phase for the two diagonal pairs.
const quadrupedLegs = [
  { hip: 521, foot: 554, bend: -29, phase: Math.PI, color: "#8caa9d" },
  { hip: 679, foot: 748, bend: 7, phase: 0, color: "#8caa9d" },
  { hip: 529, foot: 470, bend: 46, phase: 0, color: robotOutline },
  { hip: 683, foot: 702, bend: -59, phase: Math.PI, color: robotOutline },
];
const droneRotors = [[876, 193], [920, 177], [1080, 177], [1124, 193]];

function progress(time, start, duration) {
  return Math.max(0, Math.min(1, (time - start) / duration));
}

function pathPoint(path, fraction) {
  const lengths = path.slice(1).map(([x, y], i) => Math.hypot(x - path[i][0], y - path[i][1]));
  let distance = fraction * lengths.reduce((sum, length) => sum + length, 0);
  for (const [i, length] of lengths.entries()) {
    if (distance <= length) {
      const [x, y] = path[i];
      const [nextX, nextY] = path[i + 1];
      return [x + (nextX - x) * distance / length, y + (nextY - y) * distance / length];
    }
    distance -= length;
  }
  return path.at(-1);
}

function drawSignal(ctx, path, amount, color) {
  if (amount <= 0 || amount >= 1) return;
  const [x, y] = pathPoint(path, amount);
  const [tailX, tailY] = pathPoint(path, Math.max(0, amount - 0.055));
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawReasoning(ctx, time) {
  // Positions are in the coordinate system of the diagram image.
  const reset = progress(time, 4960, reasoningDuration - 4960);
  const drift = 3 * fullTurn * time / reasoningDuration;
  stateCenters.forEach((center, i) => {
    const step = progress(time, stateTimes[i], 930);
    if (step === 1 && reset === 0) return;

    const active = step > 0 ? Math.sin(Math.PI * step) : 0;
    ctx.fillStyle = "#fff";
    ctx.fillRect(center - 55, 130, 110, 104);
    if (active > 0) {
      ctx.fillStyle = `rgba(218, 236, 226, ${0.7 * active})`;
      ctx.fillRect(center - 55, 130, 110, 104);
      ctx.strokeStyle = `rgba(63, 112, 96, ${active})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(center - 65, 121, 130, 125, 11);
      ctx.stroke();
    }

    reasoningStates[i].forEach((final, j) => {
      const change = progress(step, (j % 3) * 0.10, 0.76) * (1 - reset);
      const phase = drift + i * 1.3 + j * 2.1;
      const noise = initialState[(j + i * 2) % initialState.length] + 0.13 * Math.sin(phase);
      const value = noise * (1 - change) + final * change;
      const x = center + ((j % 3) - 1) * 30 + 9 * Math.cos(phase) * (1 - change);
      const y = 153 + Math.floor(j / 3) * 30 + 9 * Math.sin(phase) * (1 - change);
      ctx.fillStyle = `rgb(${Math.round(216 - 152 * value)}, ${Math.round(230 - 119 * value)}, ${Math.round(222 - 126 * value)})`;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, fullTurn);
      ctx.fill();
    });
  });

  const reasoningArrows = [[148, 225], [410, 538], [722, 850], [1035, 1114]];
  const answerTime = 4210;
  reasoningArrows.forEach(([left, right], i) => {
    const arrives = stateTimes[i] ?? answerTime;
    drawSignal(ctx, [[left, 183], [right, 183]], progress(time, arrives - 370, 400), flowColor);
  });

  if (time < answerTime || reset > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${time < answerTime ? 1 : reset})`;
    ctx.fillRect(1155, 194, 61, 16);
  } else {
    const glow = Math.sin(Math.PI * progress(time, answerTime, 530));
    ctx.strokeStyle = `rgba(63, 112, 96, ${glow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(1206, 201, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWheeledVehicle(ctx, image, phase) {
  const travel = -55 * Math.cos(phase);
  ctx.save();
  ctx.translate(206 + travel, 404);
  ctx.scale(0.86, 0.86);
  ctx.translate(-206, -404);
  ctx.drawImage(image, 42, 205, 330, 199, 42, 205, 330, 199);
  for (const x of [112, 292]) {
    ctx.save();
    ctx.translate(x, 361);
    ctx.rotate(travel / 39);
    ctx.strokeStyle = "#a9c3b7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawQuadruped(ctx, image, phase) {
  const gait = phase * 3;
  const bodyLift = 8 * Math.abs(Math.sin(gait));
  const hipY = 256 - bodyLift;
  ctx.save();
  ctx.translate(599 - 38 * Math.cos(phase), 405);
  ctx.scale(0.86, 0.86);
  ctx.translate(-599, -405);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const leg of quadrupedLegs) {
    const step = gait + leg.phase;
    const footX = leg.foot + 32 * Math.cos(step);
    const footY = 397 - 42 * Math.max(0, Math.sin(step));
    ctx.strokeStyle = leg.color;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(leg.hip, hipY);
    ctx.lineTo((leg.hip + footX) / 2 + leg.bend, (hipY + footY) / 2 - 16);
    ctx.lineTo(footX, footY);
    ctx.lineTo(footX - 15, footY);
    ctx.stroke();
  }
  ctx.drawImage(image, 431, 190, 309, 80, 431, 190 - bodyLift, 309, 80);
  ctx.restore();
}

function drawDrone(ctx, image, phase) {
  const lift = (1 - Math.cos(phase)) / 2;
  const drift = 17 * Math.sin(phase);
  ctx.fillStyle = `rgba(63, 112, 96, ${0.17 - 0.09 * lift})`;
  ctx.beginPath();
  ctx.ellipse(1000 + drift, 405, 75 - 28 * lift, 7, 0, 0, fullTurn);
  ctx.fill();

  ctx.save();
  ctx.translate(1000 + drift, 232 + 49 - 52 * lift);
  ctx.rotate(0.07 * Math.sin(phase));
  ctx.translate(-1000, -232);
  ctx.drawImage(image, 827, 167, 350, 137, 827, 167, 350, 137);
  ctx.strokeStyle = flowColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  droneRotors.forEach(([x, y], i) => {
    const blade = phase * 16 + i * Math.PI / 4;
    const dx = 26 * Math.cos(blade);
    const dy = 4 * Math.sin(blade);
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x + dx, y + dy);
  });
  ctx.stroke();
  ctx.restore();
}

function drawRoboticArm(ctx, image, phase) {
  ctx.drawImage(image, 1306, 354, 193, 49, 1306, 354, 193, 49);
  const joints = [[1400, 337]];
  const links = [
    [77, -2.12 + 0.40 * Math.sin(phase)],
    [97, -1.02 + 0.46 * Math.sin(phase + 0.6)],
    [79, 0.55 + 0.51 * Math.sin(phase + 1.2)],
  ];
  for (const [length, angle] of links) {
    const [x, y] = joints.at(-1);
    joints.push([x + length * Math.cos(angle), y + length * Math.sin(angle)]);
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  joints.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = robotOutline;
  ctx.lineWidth = 32;
  ctx.stroke();
  ctx.strokeStyle = "#a5c3b7";
  ctx.lineWidth = 23;
  ctx.stroke();

  ctx.strokeStyle = robotOutline;
  ctx.fillStyle = robotJoint;
  ctx.lineWidth = 5;
  joints.forEach(([x, y], i) => {
    ctx.beginPath();
    ctx.arc(x, y, i === joints.length - 1 ? 12 : 15, 0, fullTurn);
    ctx.fill();
    ctx.stroke();
  });

  const [wristX, wristY] = joints.at(-1);
  const opening = 15 + 8 * Math.sin(phase + 1.6);
  ctx.translate(wristX, wristY);
  ctx.rotate(0.32 * Math.sin(phase));
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(0, 31);
  ctx.moveTo(-opening, 48);
  ctx.lineTo(-10, 31);
  ctx.lineTo(10, 31);
  ctx.lineTo(opening, 48);
  ctx.stroke();
  ctx.restore();
}

function drawRobotTeam(ctx, image, time) {
  const phase = fullTurn * (time / robotDuration + 0.08);
  // Keep the plan connectors and animate the robots below them.
  ctx.drawImage(image, 0, 0, 1600, 167, 0, 0, 1600, 167);
  ctx.strokeStyle = "#b9cfc4";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(40, 405);
  ctx.lineTo(775, 405);
  ctx.moveTo(1280, 405);
  ctx.lineTo(1533, 405);
  ctx.stroke();

  drawWheeledVehicle(ctx, image, phase);
  drawQuadruped(ctx, image, phase);
  drawDrone(ctx, image, phase);
  drawRoboticArm(ctx, image, phase);
}

function drawCoordination(ctx, time, label) {
  const phase = time < 1740 ? "Sharing observations"
    : time < 2390 ? "Updating joint plan"
    : time < 4000 ? "Assigning tasks"
    : "Joint plan updated";
  if (label.textContent !== phase) label.textContent = phase;

  robotBranches.forEach((path, i) => {
    drawSignal(ctx, path, progress(time, 100 + i * 140, 1080 + i * 40), observationColor);
    const assignment = progress(time, 2330 + i * 140, 1070);
    drawSignal(ctx, assignmentRoutes[i], assignment, flowColor);
    const confirmed = progress(time, 3400 + i * 140, 270);
    if (confirmed > 0) {
      const [x, y] = path[0];
      ctx.strokeStyle = flowColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 11, y + 20);
      ctx.lineTo(x - 4, y + 27);
      ctx.lineTo(x + 10, y + 13);
      ctx.stroke();
    }
  });

  const update = progress(time, 1590, 830);
  if (update > 0 && update < 1) {
    ctx.strokeStyle = `rgba(63, 112, 96, ${Math.sin(update * Math.PI)})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(800, 53, 12 + 14 * update, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function enableResearchAnimation(figure) {
  const canvas = figure.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const controls = figure.querySelector(".research-animation-controls");
  const button = controls.querySelector("button");
  const artwork = figure.querySelector(".research-animation");
  const image = artwork.querySelector("img");
  const label = figure.querySelector(".research-plan-label");
  const isReasoning = figure.dataset.animation === "reasoning";
  const name = isReasoning ? "reasoning dynamics" : "robot coordination";
  const duration = isReasoning ? reasoningDuration : robotDuration;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = null;
  let startedAt = 0;
  let elapsed = 0;
  let inView = false;
  let wantsPlayback = !motion.matches;

  function setAction(action) {
    button.textContent = `${action} animation`;
    button.setAttribute("aria-label", `${action} animation for ${name}`);
  }

  function paint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (isReasoning) {
      drawReasoning(ctx, elapsed);
    } else {
      drawRobotTeam(ctx, image, elapsed);
      drawCoordination(ctx, elapsed, label);
    }
  }

  function render(now) {
    // The clock advances only while the artwork is visible and playing.
    elapsed = Math.max(0, now - startedAt) % duration;
    paint();
    frame = requestAnimationFrame(render);
  }

  function syncPlayback() {
    const canPlay = inView && !document.hidden && wantsPlayback && image.naturalWidth > 0;
    if (canPlay && frame === null) {
      startedAt = performance.now() - elapsed;
      if (canvas.hidden) {
        paint();
        canvas.hidden = false;
        if (!isReasoning) artwork.classList.add("research-animated");
      }
      frame = requestAnimationFrame(render);
    } else if (!canPlay && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
    setAction(canPlay ? "Pause" : canvas.hidden ? "Play" : "Resume");
  }

  button.addEventListener("click", () => {
    wantsPlayback = frame === null;
    syncPlayback();
  });
  image.addEventListener("load", syncPlayback, { once: true });
  document.addEventListener("visibilitychange", syncPlayback);
  motion.addEventListener("change", () => {
    wantsPlayback = !motion.matches;
    syncPlayback();
  });
  controls.hidden = false;

  const observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRect.height > 0 && entry.intersectionRect.width > 0;
    syncPlayback();
  }, { threshold: [0, Number.EPSILON] });
  observer.observe(artwork);
}

document.querySelectorAll(".research-direction-figure[data-animation]").forEach(enableResearchAnimation);
