import { useEffect, useRef, useState } from 'react';

export function NeonGradientCard({
  children,
  borderSize = 2,
  borderRadius = 20,
  neonColors = { firstColor: '#ff00aa', secondColor: '#00FFF1' },
  style = {},
  className = '',
}) {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const update = () => {
    if (containerRef.current) {
      setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
    }
  };

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    update();
  }, [children]);

  const pseudoW = dims.w + borderSize * 2;
  const pseudoH = dims.h + borderSize * 2;
  const afterBlur = dims.w / 3;
  const gradient = `linear-gradient(0deg, ${neonColors.firstColor}, ${neonColors.secondColor})`;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        borderRadius,
        ...style,
      }}
    >
      {/* Glow layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -borderSize,
          borderRadius,
          background: gradient,
          backgroundSize: '100% 200%',
          animation: 'neon-bg-spin 3000ms infinite alternate',
          zIndex: -1,
          filter: `blur(${afterBlur}px)`,
          opacity: 0.8,
        }}
      />
      {/* Border layer */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: -borderSize,
          borderRadius,
          background: gradient,
          backgroundSize: '100% 200%',
          animation: 'neon-bg-spin 3000ms infinite alternate',
          zIndex: -1,
        }}
      />
      {/* Content — uses CSS variable so dark mode works correctly */}
      <div
        style={{
          position: 'relative',
          borderRadius: borderRadius - borderSize,
          background: 'var(--bg-card)',
          padding: '1.5rem',
          minHeight: 'inherit',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function Meteors({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
}) {
  const [meteorStyles, setMeteorStyles] = useState([]);

  useEffect(() => {
    const styles = Array.from({ length: number }, () => ({
      '--angle': `${-angle}deg`,
      top: '-5%',
      left: `calc(0% + ${Math.floor(Math.random() * window.innerWidth)}px)`,
      animationDelay: `${Math.random() * (maxDelay - minDelay) + minDelay}s`,
      animationDuration: `${Math.floor(Math.random() * (maxDuration - minDuration) + minDuration)}s`,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMeteorStyles(styles);
  }, [number, minDelay, maxDelay, minDuration, maxDuration, angle]);

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          style={{
            ...style,
            position: 'absolute',
            width: '2px',
            height: '2px',
            transform: 'rotate(var(--angle))',
            borderRadius: '9999px',
            backgroundColor: '#71717a',
            boxShadow: '0 0 0 1px #ffffff10',
            pointerEvents: 'none',
            animation: 'meteor var(--anim-duration, 5s) linear infinite',
            animationDelay: style.animationDelay,
            animationDuration: style.animationDuration,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: -10,
              height: '1px',
              width: '50px',
              background: 'linear-gradient(to right, #71717a, transparent)',
            }}
          />
        </span>
      ))}
    </>
  );
}
