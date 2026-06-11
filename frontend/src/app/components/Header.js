'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import config from '../../config.json';
import styles from './Header.module.css';

const APP_NAME = config.app.name;

function NavLinks({ authEnabled, session, pathname }) {
  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <Link
        href="/"
        className={`${styles.navLink} ${pathname === '/' ? styles.active : ''}`}
      >
        Tracker
      </Link>
      <Link
        href="/explore"
        className={`${styles.navLink} ${pathname === '/explore' ? styles.active : ''}`}
      >
        Explore
      </Link>
      {authEnabled && session && (
        <>
          <Link
            href="/dashboard"
            className={`${styles.navLink} ${pathname === '/dashboard' ? styles.active : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href="/patterns"
            className={`${styles.navLink} ${pathname === '/patterns' ? styles.active : ''}`}
          >
            Patterns
          </Link>
          <Link
            href="/platforms"
            className={`${styles.navLink} ${pathname === '/platforms' ? styles.active : ''}`}
          >
            Platforms
          </Link>
          <Link
            href="/settings"
            className={`${styles.navLink} ${pathname === '/settings' ? styles.active : ''}`}
          >
            Settings
          </Link>
        </>
      )}
      <Link
        href="/about"
        className={`${styles.navLink} ${pathname === '/about' ? styles.active : ''}`}
      >
        About
      </Link>
    </nav>
  );
}

function UserAvatar({ session }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const initial = (session.user.name || session.user.email || 'U')[0].toUpperCase();

  return (
    <div className={styles.avatarWrapper} ref={ref}>
      {session.user.image ? (
        <button
          className={styles.avatarBtn}
          onClick={() => setOpen(v => !v)}
          title={session.user.name || session.user.email}
          aria-label="User menu"
        >
          {/* Using plain <img> to avoid next/image hostname config — avatar is tiny */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={session.user.image}
            alt={initial}
            width={36}
            height={36}
            className={styles.avatarImg}
          />
        </button>
      ) : (
        <button
          className={styles.avatarBtn}
          onClick={() => setOpen(v => !v)}
          title={session.user.name || session.user.email}
          aria-label="User menu"
        >
          {initial}
        </button>
      )}

      {open && (
        <div className={styles.userDropdown} role="menu" aria-label="User options">
          <div className={styles.dropdownUserInfo}>
            <div className={styles.dropdownName}>{session.user.name}</div>
            <div className={styles.dropdownEmail}>{session.user.email}</div>
          </div>
          <button
            className={styles.dropdownBtn}
            onClick={() => { signOut(); setOpen(false); }}
            role="menuitem"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header({ authEnabled }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left: logo + nav */}
        <div className={styles.left}>
          <Link href="/" className={styles.logo} aria-label={`${APP_NAME} home`}>
            <Image
              src="/logo.svg"
              alt={`${APP_NAME} logo`}
              width={36}
              height={36}
              className={styles.logoImg}
              priority
            />
            <span className={styles.logoText}>{APP_NAME}</span>
          </Link>
          <NavLinks authEnabled={authEnabled} session={session} pathname={pathname} />
        </div>

        {/* Right: Add link + theme + auth */}
        <div className={styles.right}>
          {authEnabled && session && (
            <Link href="/add" className={styles.addLink}>
              + Add
            </Link>
          )}
          <div className={styles.themeToggleWrapper}>
            <ThemeToggle />
          </div>
          {authEnabled && (
            session ? (
              <UserAvatar session={session} />
            ) : (
              <button
                onClick={() => signIn('google')}
                className={styles.loginBtn}
                aria-label="Sign in with Google"
              >
                <span className={styles.googleIcon} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <g fill="none" fillRule="evenodd">
                      <path d="M17.64 9.2a10.341 10.341 0 0 0-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                    </g>
                  </svg>
                </span>
                Sign in with Google
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
