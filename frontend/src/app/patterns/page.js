/**
 * /patterns — Manage algorithmic pattern categories.
 * This is a Server Component (no 'use client') so it can export metadata.
 * All client-side interactivity lives in the shared MetadataPage component.
 */
import MetadataPage from '../components/MetadataPage';

export const metadata = {
  title: 'Patterns',
  description: 'Manage algorithmic patterns used to categorise problems.',
};

export default function PatternsPage() {
  return (
    <MetadataPage
      type="patterns"
      title="Patterns"
      subtitle="Manage algorithmic patterns used to categorise problems."
      namePlaceholder="e.g. Monotonic Stack"
      descPlaceholder="Optional description"
      addLabel="Add Pattern"
      showDescription
    />
  );
}
