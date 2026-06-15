import React, { useState } from 'react';

import { useAppStore } from '../store/useAppStore';

export default function FloatingGoalWidget({ mode }) {
  const [isOpen, setIsOpen] = useState(false);

  const isSD = mode === 'system-design-tracker';

  const dailyCount = useAppStore((state) => isSD ? state.stats.sdDailyCount : state.stats.dailyCount) || 0;
  const weeklyCount = useAppStore((state) => isSD ? state.stats.sdWeeklyCount : state.stats.weeklyCount) || 0;

  const dailyGoal = parseInt(useAppStore((state) => isSD ? state.settings.sdDailyGoal : state.settings.dailyGoal) || (isSD ? '1' : '2'), 10);
  const weeklyGoal = parseInt(useAppStore((state) => isSD ? state.settings.sdWeeklyGoal : state.settings.weeklyGoal) || (isSD ? '3' : '10'), 10);

  const dailyPercent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));
  const weeklyPercent = Math.min(100, Math.round((weeklyCount / weeklyGoal) * 100));

  const getEmoji = (percent) => {
    if (percent >= 100) return '🎉';
    if (percent >= 50) return '😄';
    if (percent > 0) return '🙂';
    return '😢';
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '1rem',
      }}
    >
      {/* Popover */}
      {isOpen && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            width: '280px',
            backdropFilter: 'blur(10px)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <h3
            style={{
              margin: '0 0 1rem 0',
              fontSize: '1.1rem',
              color: 'var(--text-main)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Goals</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ✕
            </button>
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                marginBottom: '4px',
              }}
            >
              <span>{getEmoji(dailyPercent)} Daily</span>
              <span style={{ fontWeight: 600 }}>
                {dailyCount} / {dailyGoal}
              </span>
            </div>
            <div
              style={{
                height: '8px',
                background: 'var(--bg-hover)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${dailyPercent}%`,
                  background: 'var(--primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                marginBottom: '4px',
              }}
            >
              <span>{getEmoji(weeklyPercent)} Weekly</span>
              <span style={{ fontWeight: 600 }}>
                {weeklyCount} / {weeklyGoal}
              </span>
            </div>
            <div
              style={{
                height: '8px',
                background: 'var(--bg-hover)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${weeklyPercent}%`,
                  background: 'var(--success)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          cursor: 'pointer',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        }}
        title="View Goals"
      >
        {getEmoji(dailyPercent)}
      </button>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
