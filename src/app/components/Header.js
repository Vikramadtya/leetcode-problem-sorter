'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import styles from './Header.module.css';

export default function Header({ authEnabled, isMockMode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>&lt;/&gt;</span>
            <span className={styles.logoText}>LeetCode Prep</span>
          </div>
          <nav className={styles.nav}>
            <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}>Tracker</Link>
            <Link href="/explore" className={`${styles.navLink} ${pathname === '/explore' ? styles.active : ''}`}>Explore</Link>
            {authEnabled && (
              <>
                <Link href="/add" className={`${styles.navLink} ${pathname === '/add' ? styles.active : ''}`}>Add</Link>
                <Link href="/patterns" className={`${styles.navLink} ${pathname === '/patterns' ? styles.active : ''}`}>Patterns</Link>
                <Link href="/platforms" className={`${styles.navLink} ${pathname === '/platforms' ? styles.active : ''}`}>Platforms</Link>
                <Link href="/dashboard" className={`${styles.navLink} ${pathname === '/dashboard' ? styles.active : ''}`}>Dashboard</Link>
              </>
            )}
            <Link href="/about" className={`${styles.navLink} ${pathname === '/about' ? styles.active : ''}`}>About</Link>
          </nav>
        </div>
        <div className={styles.right}>
          <ThemeToggle />
          {authEnabled && (
            session ? (
              <div className={styles.userMenu}>
                <span className={styles.userName}>{session.user.name || session.user.email}</span>
                <button className={styles.iconBtn} onClick={() => signOut()} title="Sign Out">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            ) : (
              <button onClick={() => isMockMode ? signIn('credentials') : signIn('google')} className={styles.loginBtn}>
                Sign In
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
