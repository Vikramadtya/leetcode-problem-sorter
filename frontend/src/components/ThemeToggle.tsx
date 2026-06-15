import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.placeholder}></div>;
  }

  return (
    <button
      className={styles.toggleBtn}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <img src="/icons/sun.svg" alt="Light mode" width={24} height={24} />
      ) : (
        <img src="/icons/moon.svg" alt="Dark mode" width={24} height={24} />
      )}
    </button>
  );
}
