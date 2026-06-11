/**
 * /tags — Manage custom question tags.
 * This is a Server Component (no 'use client') so it can export metadata.
 * All client-side interactivity lives in the shared MetadataPage component.
 */
import MetadataPage from '../components/MetadataPage';

export const metadata = {
  title: 'Tags',
  description: 'Manage custom tags for categorising problems.',
};

export default function TagsPage() {
  return (
    <MetadataPage
      type="tags"
      title="Tags"
      subtitle="Manage custom tags for categorising problems."
      namePlaceholder="e.g. Interview Favourite"
      addLabel="Add Tag"
    />
  );
}
