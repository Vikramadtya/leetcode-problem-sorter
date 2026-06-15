import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function GlobalAudioListener() {
  const pathname = useLocation();
  const clickAudioRef = useRef(null);
  const pageAudioRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      clickAudioRef.current = new Audio('/sounds/switch-on.mp3');
      clickAudioRef.current.volume = 0.4;

      pageAudioRef.current = new Audio('/sounds/page-change.mp3');
      pageAudioRef.current.volume = 0.3;
    }

    const handleClick = (e) => {
      // Find the closest clickable element
      const target = e.target.closest(
        'button, a, [role="button"], input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"]'
      );

      if (target) {
        // Only play if it's not disabled
        if (!target.disabled && target.getAttribute('aria-disabled') !== 'true') {
          // If it's a link, let the pathname useEffect handle the page-change sound.
          // Otherwise, play the standard click sound.
          const isLink = target.tagName && target.tagName.toLowerCase() === 'a';

          if (!isLink && clickAudioRef.current) {
            clickAudioRef.current.currentTime = 0;
            clickAudioRef.current.play().catch((err) => {
              console.debug('Audio play failed:', err);
            });
          }
        }
      }
    };

    document.addEventListener('click', handleClick, true); // use capture phase
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // Play sound on route changes, skipping the initial mount (since browsers block autoplay)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (pageAudioRef.current) {
      pageAudioRef.current.currentTime = 0;
      pageAudioRef.current.play().catch(() => {});
    }
  }, [pathname]);

  return null;
}
