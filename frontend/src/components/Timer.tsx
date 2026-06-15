import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const Timer = forwardRef(({ autoStart = true, onTimeChange }, ref) => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(autoStart);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => {
          const newTime = s + 1;
          if (onTimeChange) onTimeChange(newTime);
          return newTime;
        });
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds, onTimeChange]);

  useImperativeHandle(ref, () => ({
    getTime: () => seconds,
    reset: () => {
      setSeconds(0);
      setIsActive(false);
    },
    start: () => setIsActive(true),
    stop: () => setIsActive(false),
  }));

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'monospace',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: 'var(--text-main)',
        background: 'var(--bg-hover)',
        padding: '4px 12px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <span>⏱️ {formatTime(seconds)}</span>
      <button
        type="button"
        onClick={() => setIsActive(!isActive)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1rem',
          color: 'var(--text-muted)',
        }}
        title={isActive ? 'Pause Timer' : 'Start Timer'}
      >
        {isActive ? '⏸️' : '▶️'}
      </button>
    </div>
  );
});

Timer.displayName = 'Timer';
export default Timer;
