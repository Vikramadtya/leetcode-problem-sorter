import { Helmet } from 'react-helmet-async';

export default function SEO({
  title,
  description = 'Tacker is a modern platform to track, manage, and optimize your coding practice and problem-solving journey.',
}) {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
    </Helmet>
  );
}
