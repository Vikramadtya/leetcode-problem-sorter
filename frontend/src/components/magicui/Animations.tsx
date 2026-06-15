/* eslint-disable */

import { motion, AnimatePresence } from 'motion/react';
import React, { useEffect, useState, memo } from 'react';

// ─── SparklesText ─────────────────────────────────────────────────────────────

const Sparkle = ({ id, x, y, color, delay, scale }) => (
  <motion.svg
    key={id}
    style={{ position: 'absolute', pointerEvents: 'none', zIndex: 20, left: x, top: y }}
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 1, 0], scale: [0, scale, 0], rotate: [75, 120, 150] }}
    transition={{ duration: 0.8, repeat: Infinity, delay }}
    width="21"
    height="21"
    viewBox="0 0 21 21"
  >
    <path
      d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
      fill={color}
    />
  </motion.svg>
);

export function SparklesText({
  children,
  colors = { first: '#9E7AFF', second: '#FE8BBB' },
  className = '',
  style = {},
  sparklesCount = 10,
}) {
  const [sparkles, setSparkles] = useState(() => {
    const generate = () => ({
      id: `${Math.random()}-${Date.now()}`,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: Math.random() > 0.5 ? colors.first : colors.second,
      delay: Math.random() * 2,
      scale: Math.random() * 1 + 0.3,
      lifespan: Math.random() * 10 + 5,
    });
    return Array.from({ length: sparklesCount }, generate);
  });

  useEffect(() => {
    const generate = () => ({
      id: `${Math.random()}-${Date.now()}`,
      x: `${Math.random() * 100}%`,
      y: `${Math.random() * 100}%`,
      color: Math.random() > 0.5 ? colors.first : colors.second,
      delay: Math.random() * 2,
      scale: Math.random() * 1 + 0.3,
      lifespan: Math.random() * 10 + 5,
    });

    const id = setInterval(() => {
      setSparkles((curr) =>
        curr.map((s) => (s.lifespan <= 0 ? generate() : { ...s, lifespan: s.lifespan - 0.1 }))
      );
    }, 100);
    return () => clearInterval(id);
  }, [colors.first, colors.second]);

  return (
    <span className={className} style={{ position: 'relative', display: 'inline-block', ...style }}>
      {sparkles.map((s) => (
        <Sparkle key={s.id} {...s} />
      ))}
      <strong>{children}</strong>
    </span>
  );
}

// ─── TextAnimate ───────────────────────────────────────────────────────────────

const staggerTimings = { text: 0.06, word: 0.05, character: 0.03, line: 0.06 };

const blurInUpVariants = {
  container: {
    hidden: { opacity: 1 },
    show: { opacity: 1, transition: { delayChildren: 0, staggerChildren: 0.03 } },
    exit: { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  },
  item: {
    hidden: { opacity: 0, filter: 'blur(10px)', y: 20 },
    show: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: { y: { duration: 0.3 }, opacity: { duration: 0.4 }, filter: { duration: 0.3 } },
    },
    exit: {
      opacity: 0,
      filter: 'blur(10px)',
      y: 20,
      transition: { y: { duration: 0.3 }, opacity: { duration: 0.4 }, filter: { duration: 0.3 } },
    },
  },
};

function TextAnimateBase({
  children,
  className = '',
  by = 'word',
  once = false,
  startOnView = true,
  as: Component = 'p',
}) {
  const MotionComponent = React.useMemo(() => motion.create(Component), [Component]);
  // Guard: children must be a plain string
  const text = typeof children === 'string' ? children : String(children ?? '');
  const segments = by === 'character' ? text.split('') : text.split(/(\s+)/);

  return (
    <AnimatePresence mode="popLayout">
      <MotionComponent
        variants={blurInUpVariants.container}
        initial="hidden"
        whileInView={startOnView ? 'show' : undefined}
        animate={startOnView ? undefined : 'show'}
        exit="exit"
        className={className}
        style={{ whiteSpace: 'pre-wrap' }}
        viewport={{ once }}
      >
        {segments.map((seg, i) => (
          <motion.span
            key={`${seg}-${i}`}
            variants={blurInUpVariants.item}
            style={{ display: 'inline-block', whiteSpace: 'pre' }}
          >
            {seg}
          </motion.span>
        ))}
      </MotionComponent>
    </AnimatePresence>
  );
}

export const TextAnimate = React.memo(TextAnimateBase);
