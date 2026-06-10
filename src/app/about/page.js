import Header from '../components/Header';
import styles from './page.module.css';

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <Header authEnabled={true} />
      <main className={styles.main}>
        <div className={styles.contentCard}>
          <h1 className={styles.title}>About LeetCode Prep</h1>
          <p className={styles.paragraph}>
            LeetCode Prep is an advanced problem-solving tracker inspired by Tacker.
            It helps developers organize their competitive programming and interview
            preparation across multiple platforms.
          </p>
          
          <h2 className={styles.heading}>Features</h2>
          <ul className={styles.list}>
            <li><strong>Cross-Platform Tracking:</strong> Track problems from LeetCode, Codeforces, HackerRank, and more.</li>
            <li><strong>Pattern Recognition:</strong> Tag problems with specific algorithm patterns to spot your strengths.</li>
            <li><strong>Spaced Repetition:</strong> Built-in confidence intervals flag problems that are due for revision.</li>
            <li><strong>Contribution Heatmap:</strong> A beautiful GitHub-style calendar visualizes your daily consistency.</li>
          </ul>

          <h2 className={styles.heading}>Open Source</h2>
          <p className={styles.paragraph}>
            This application is built with Next.js, React, and Prisma. It runs blazingly fast
            with a sleek Vanilla CSS design system. Keep grinding!
          </p>
        </div>
      </main>
    </div>
  );
}
