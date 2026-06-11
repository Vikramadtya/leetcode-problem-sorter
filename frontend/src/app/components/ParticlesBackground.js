'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Particles } from './magicui/Particles';

/**
 * ParticlesBackground — theme-aware canvas particle dots.
 * Renders black dots on light, white dots on dark.
 * Uses mounted guard to avoid SSR hydration mismatch.
 */
export default function ParticlesBackground() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const color = resolvedTheme === 'dark' ? '#ffffff' : '#000000';

  return (
    <Particles
      aria-hidden="true"
      quantity={80}
      ease={80}
      color={color}
      staticity={60}
      size={0.3}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
