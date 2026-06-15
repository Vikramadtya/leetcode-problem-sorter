import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '../store/useAppStore';

/**
 * useModalHandlers — Returns stable callbacks for the three progress modals
 * used on both the Tracker and Explore pages.
 *
 * All handlers call `updateProgress` from the Zustand store, which performs
 * an optimistic update → PATCH → server-authoritative replace.
 *
 * @param {object}   opts
 * @param {Function} opts.setActiveInitialSolveQ   State setter for initial-solve modal question
 * @param {Function} opts.setActiveReflectionQ      State setter for reflection modal question
 * @param {Function} opts.navigate                  Navigate function for notes routing
 */
export function useModalHandlers({
  setActiveInitialSolveQ,
  setActiveReflectionQ,
  navigate,
}) {
  const { questions, updateProgress } = useAppStore(
    useShallow((state) => ({
      questions: state.questions,
      updateProgress: state.updateProgress,
    }))
  );

  /**
   * handleSaveInitialSolve — called when the user submits the first-time solve modal.
   * Marks the question as Solved and stores the solution metadata.
   */
  const handleSaveInitialSolve = useCallback(
    (id, { solutionLink, notes, pattern, memoryStrength }) => {
      const payload = {
        status: 'Solved',
        confidenceLevel: memoryStrength,
        notes: notes || '',
        pattern: pattern || '',
      };
      if (solutionLink) {
        payload.solutionLink = solutionLink;
      }
      updateProgress(id, payload);
      setActiveInitialSolveQ(null);
    },
    [updateProgress, setActiveInitialSolveQ]
  );

  /**
   * handleSaveReflection — called when the user submits the revision reflection modal.
   * Appends the new insight to existing notes rather than replacing them.
   */
  const handleSaveReflection = useCallback(
    (id, { insight, pattern, memoryStrength }) => {
      const q = questions.find((q) => q.id === id);
      const existingNotes = q?.progress?.notes || '';

      // Append reflection block — preserves previous notes
      const updatedNotes = insight
        ? existingNotes
          ? `${existingNotes}\n\n**Reflection:**\n${insight}`
          : `**Reflection:**\n${insight}`
        : existingNotes;

      updateProgress(id, {
        revise: true,
        confidenceLevel: memoryStrength,
        notes: updatedNotes,
        pattern: pattern || q?.progress?.pattern || '',
      });
      setActiveReflectionQ(null);
    },
    [questions, updateProgress, setActiveReflectionQ]
  );

  /**
   * handleOpenNotes — routes the user to the dedicated Note Page.
   */
  const handleOpenNotes = useCallback((q) => {
    if (navigate) {
      navigate(`/notes/${q.id}`);
    }
  }, [navigate]);

  return { handleSaveInitialSolve, handleSaveReflection, handleOpenNotes };
}
