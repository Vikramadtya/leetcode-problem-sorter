'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import styles from './Header.module.css';

export default function Header({ authEnabled }) {
  const { data: session } = useSession();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>&lt;/&gt;</span>
            <span className={styles.logoText}>LeetCode Prep</span>
          </div>
          <nav className={styles.nav}>
            <Link href="/" className={`${styles.navLink} ${styles.active}`}>Questions</Link>
            {authEnabled && <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>}
          </nav>
        </div>
        {authEnabled && (
          <div className={styles.right}>
            {session ? (
              <div className={styles.userMenu}>
                <span className={styles.userName}>{session.user.name || session.user.email}</span>
                <button className={styles.iconBtn} onClick={() => signOut()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            ) : (
              <button className={styles.loginBtn} onClick={() => signIn('google')}>
                Sign In
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
