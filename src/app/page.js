'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import Header from './components/Header';
import Filters from './components/Filters';
import StatsBar from './components/StatsBar';
import Table from './components/Table';
import styles from './page.module.css';

export default function Home() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState({});
  const [authEnabled, setAuthEnabled] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setAuthEnabled(data.authEnabled);
      });

    fetch('/api/companies')
      .then(res => res.json())
      .then(data => {
        if (data.companies) {
          setCompanies(data.companies);
          if (data.companies.includes('1kosmos')) {
            setSelectedCompany('1kosmos');
            setSelectedPeriod('more-than-six-months');
          } else if (data.companies.length > 0) {
            setSelectedCompany(data.companies[0]);
          }
        }
      });
      
    fetch('/api/progress')
      .then(res => res.json())
      .then(data => {
        if (data.progress) setProgress(data.progress);
      });
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetch(`/api/questions?company=${selectedCompany}&period=${selectedPeriod}`)
        .then(res => res.json())
        .then(data => {
          if (data.questions) setQuestions(data.questions);
        });
    }
  }, [selectedCompany, selectedPeriod]);

  const handleToggleStatus = (id) => {
    if (!session) {
      signIn('google');
      return;
    }

    const isSolved = progress[id]?.solved;
    const newSolved = !isSolved;
    const newDate = newSolved ? new Date().toISOString() : null;
    
    const updates = { solved: newSolved, dateSolved: newDate };
    
    // Optimistic update
    setProgress(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const handleToggleRevise = (id) => {
    if (!session) {
      signIn('google');
      return;
    }

    const isRevise = progress[id]?.revise;
    const updates = { revise: !isRevise };
    
    setProgress(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));

    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates })
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedQuestions = [...questions].filter(q => {
    if (difficultyFilter !== 'all') {
      return q.Difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
    }
    return true;
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'Difficulty') {
      const order = { 'easy': 1, 'medium': 2, 'hard': 3 };
      aVal = order[aVal?.toLowerCase()] || 0;
      bVal = order[bVal?.toLowerCase()] || 0;
    } else if (sortConfig.key === 'Acceptance %' || sortConfig.key === 'Frequency %') {
      aVal = parseFloat(aVal?.replace('%', '')) || 0;
      bVal = parseFloat(bVal?.replace('%', '')) || 0;
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate stats based on processedQuestions or original questions?
  // Usually stats show total available in the dataset before sort/filter, 
  // but showing them for processed is fine too. Let's do original so it stays constant.
  const stats = {
    solved: 0,
    unsolved: 0,
    easy: 0,
    medium: 0,
    hard: 0
  };

  questions.forEach(q => {
    const isSolved = progress[q.ID]?.solved;
    if (isSolved) stats.solved++;
    else stats.unsolved++;

    const diff = q.Difficulty?.toLowerCase();
    if (diff === 'easy') stats.easy++;
    else if (diff === 'medium') stats.medium++;
    else if (diff === 'hard') stats.hard++;
  });

  return (
    <div className={styles.container}>
      <Header authEnabled={authEnabled} />
      <main className={styles.main}>
        <Filters 
          companies={companies}
          selectedCompany={selectedCompany}
          setSelectedCompany={setSelectedCompany}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
        />
        <StatsBar stats={stats} total={questions.length} />
        <Table 
          questions={processedQuestions}
          progress={progress}
          onToggleStatus={handleToggleStatus}
          onToggleRevise={handleToggleRevise}
          authEnabled={authEnabled}
          sortConfig={sortConfig}
          requestSort={requestSort}
        />
      </main>
      <footer className={styles.footer}>
        Made with <span className={styles.heart}>❤️</span> for the community. • Contact Us
      </footer>
    </div>
  );
}
