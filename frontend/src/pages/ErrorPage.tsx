import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import styles from './ErrorPage.module.css';

export default function ErrorPage() {
  return (
    <div className={styles.container}>
      <div className={styles.glow} />
      <div className={styles.content}>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.description}>
          The page you are looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <Link to="/" className={styles.homeBtn}>
          <Home size={18} />
          Return Home
        </Link>
      </div>
    </div>
  );
}
