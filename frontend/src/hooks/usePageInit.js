'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * usePageInit — Initialises a page in the correct data-fetch mode and wires
 * up global keyboard shortcuts.
 *
 * @param {'tracker' | 'explore'} mode
 *   'tracker' → calls resetToTrackerMode() (only shows engaged questions)
 *   'explore' → calls resetToExploreMode() (shows the full global catalogue)
 *
 * @param {object}   opts
 * @param {Function} opts.onEscape  Called when the user presses Escape (use to
 *                                   close any open modals).
 */
export function usePageInit(mode, { onEscape } = {}) {
  const { resetToTrackerMode, resetToExploreMode, fetchUtilities, fetchLightStats } =
    useAppStore();

  // ── One-time initialisation ────────────────────────────────────────────
  // useRef guard prevents StrictMode double-invoke from firing the fetch twice.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (mode === 'tracker') {
      resetToTrackerMode();
    } else {
      resetToExploreMode();
    }

    // Always fetch utilities (patterns, companies) and lightweight stats on mount.
    fetchUtilities();
    fetchLightStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      // ⌘F / Ctrl+F → focus the search input
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('filter-search')?.focus();
      }
      // Escape → delegate to the caller (usually closes open modals)
      if (e.key === 'Escape') {
        onEscape?.();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEscape]);
}
