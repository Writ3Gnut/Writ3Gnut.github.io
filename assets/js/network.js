(() => {
  const canvas = document.getElementById("network-canvas");
  const context = canvas?.getContext("2d");
  if (!context) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = { x: 0, y: 0, active: false };
  let width = 0;
  let height = 0;
  let particles = [];
  let frame = 0;
  let lastTime = 0;
  const color = "96, 186, 255";

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Cap the pair comparisons and scale density down on small screens.
    const count = Math.min(100, Math.max(24, Math.round(width * height / 13000)));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      radius: 1.2 + Math.random() * 1.1,
    }));
  };

  const line = (a, b, opacity) => {
    context.strokeStyle = `rgba(${color}, ${opacity})`;
    context.beginPath();
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
  };

  const draw = (time) => {
    frame = 0;
    const step = lastTime ? Math.min((time - lastTime) / 16.667, 2) : 1;
    lastTime = time;
    context.clearRect(0, 0, width, height);
    context.lineWidth = 0.8;
    const reach = width < 600 ? 130 : 175;
    const interactive = pointer.active && !reducedMotion.matches;

    if (interactive) {
      const glow = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 220);
      glow.addColorStop(0, `rgba(${color}, 0.12)`);
      glow.addColorStop(1, `rgba(${color}, 0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    }

    for (let i = 0; i < particles.length; i++) {
      const point = particles[i];
      if (!reducedMotion.matches) {
        point.x += point.vx * step;
        point.y += point.vy * step;
        if (point.x < 0 || point.x > width) {
          point.vx *= -1;
          point.x = Math.max(0, Math.min(width, point.x));
        }
        if (point.y < 0 || point.y > height) {
          point.vy *= -1;
          point.y = Math.max(0, Math.min(height, point.y));
        }
      }

      const distanceToPointer = interactive
        ? Math.hypot(point.x - pointer.x, point.y - pointer.y) : Infinity;
      const proximity = Math.max(0, 1 - distanceToPointer / 220);
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        const distance = Math.hypot(point.x - other.x, point.y - other.y);
        if (distance < reach) line(point, other, (1 - distance / reach) * (0.3 + proximity * 0.35));
      }
      if (proximity > 0) line(point, pointer, proximity * 0.65);
      context.fillStyle = `rgba(${color}, ${0.5 + proximity * 0.5})`;
      context.beginPath();
      context.arc(point.x, point.y, point.radius + proximity, 0, Math.PI * 2);
      context.fill();
    }

    if (interactive) {
      context.strokeStyle = `rgba(${color}, 0.65)`;
      context.beginPath();
      context.arc(pointer.x, pointer.y, 18, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(${color}, 0.25)`;
      context.beginPath();
      context.arc(pointer.x, pointer.y, 24, 0, Math.PI * 1.6);
      context.stroke();
    }

    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  };

  const restart = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (!document.hidden) frame = requestAnimationFrame(draw);
  };
  const clearPointer = () => { pointer.active = false; };

  window.addEventListener("pointermove", (event) => {
    pointer.active = event.pointerType !== "touch";
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", clearPointer);
  window.addEventListener("pointercancel", clearPointer);
  window.addEventListener("blur", clearPointer);
  window.addEventListener("resize", () => { resize(); restart(); }, { passive: true });
  document.addEventListener("visibilitychange", () => { clearPointer(); restart(); });
  reducedMotion.addEventListener("change", restart);
  resize();
  restart();
})();
