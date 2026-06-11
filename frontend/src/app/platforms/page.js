/**
 * /platforms — Manage coding platforms (e.g. LeetCode, HackerRank).
 * This is a Server Component (no 'use client') so it can export metadata.
 * All client-side interactivity lives in the shared MetadataPage component.
 */
import MetadataPage from '../components/MetadataPage';

export const metadata = {
  title: 'Platforms',
  description: 'Manage coding platforms used when adding custom problems.',
};

export default function PlatformsPage() {
  return (
    <MetadataPage
      type="platforms"
      title="Platforms"
      subtitle="Manage coding platforms used when adding custom problems."
      namePlaceholder="e.g. HackerEarth"
      descPlaceholder="Optional description"
      addLabel="Add Platform"
      showDescription
    />
  );
}
