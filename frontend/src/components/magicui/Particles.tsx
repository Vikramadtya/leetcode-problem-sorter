import { useEffect, useRef, useState } from 'react';

function useMousePosition() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  return mousePosition;
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3)
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  const hexInt = parseInt(hex, 16);
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}

export function Particles({
  className = '',
  quantity = 150,
  staticity = 50,
  ease = 80,
  size = 0.4,
  refresh = false,
  color = '#000000',
  vx = 0,
  vy = 0,
  style = {},
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const ctx = useRef(null);
  const circles = useRef([]);
  const mouse = useRef({ x: 0, y: 0 });
  const canvasSize = useRef({ w: 0, h: 0 });
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  const rafID = useRef(null);
  const resizeTimer = useRef(null);
  const mousePos = useMousePosition();

  const rgb = hexToRgb(color);

  function circleParams() {
    return {
      x: Math.floor(Math.random() * canvasSize.current.w),
      y: Math.floor(Math.random() * canvasSize.current.h),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + size,
      alpha: 0,
      targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    };
  }

  function drawCircle(circle, update = false) {
    if (!ctx.current) return;
    const { x, y, translateX, translateY, size: s, alpha } = circle;
    ctx.current.translate(translateX, translateY);
    ctx.current.beginPath();
    ctx.current.arc(x, y, s, 0, 2 * Math.PI);
    ctx.current.fillStyle = `rgba(${rgb.join(',')},${alpha})`;
    ctx.current.fill();
    ctx.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!update) circles.current.push(circle);
  }

  function clearCtx() {
    if (ctx.current) ctx.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
  }

  function initCanvas() {
    if (!containerRef.current || !canvasRef.current || !ctx.current) return;
    canvasSize.current.w = containerRef.current.offsetWidth;
    canvasSize.current.h = containerRef.current.offsetHeight;
    canvasRef.current.width = canvasSize.current.w * dpr;
    canvasRef.current.height = canvasSize.current.h * dpr;
    canvasRef.current.style.width = `${canvasSize.current.w}px`;
    canvasRef.current.style.height = `${canvasSize.current.h}px`;
    ctx.current.scale(dpr, dpr);
    circles.current = [];
    for (let i = 0; i < quantity; i++) drawCircle(circleParams());
  }

  function remapValue(v, s1, e1, s2, e2) {
    const r = ((v - s1) * (e2 - s2)) / (e1 - s1) + s2;
    return r > 0 ? r : 0;
  }

  function animate() {
    clearCtx();
    circles.current.forEach((circle, i) => {
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      const closest = edge.reduce((a, b) => Math.min(a, b));
      const remap = parseFloat(remapValue(closest, 0, 20, 0, 1).toFixed(2));
      if (remap > 1) {
        circle.alpha = Math.min(circle.alpha + 0.02, circle.targetAlpha);
      } else {
        circle.alpha = circle.targetAlpha * remap;
      }
      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;
      drawCircle(circle, true);
      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        circles.current.splice(i, 1);
        drawCircle(circleParams());
      }
    });
    rafID.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    if (canvasRef.current) ctx.current = canvasRef.current.getContext('2d');
    initCanvas();
    animate();
    const onResize = () => {
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(initCanvas, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (rafID.current) cancelAnimationFrame(rafID.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { w, h } = canvasSize.current;
    const x = mousePos.x - rect.left - w / 2;
    const y = mousePos.y - rect.top - h / 2;
    if (x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2) {
      mouse.current = { x, y };
    }
  }, [mousePos.x, mousePos.y]);

   
  useEffect(() => {
    initCanvas();
  }, [refresh]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={className}
      style={{ pointerEvents: 'none', width: '100%', height: '100%', ...style }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
