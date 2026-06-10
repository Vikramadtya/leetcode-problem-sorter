'use client';

import { useState, useEffect } from 'react';
import Header from './Header';
import styles from './ListManager.module.css';

export default function ListManager({ title, description, apiEndpoint, itemName }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetch(apiEndpoint)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiEndpoint]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
      .then(res => res.json())
      .then(data => {
        if (data.item) {
          setItems([...items, data.item]);
          setForm({ name: '', description: '' });
        }
      });
  };

  return (
    <div className={styles.container}>
      <Header authEnabled={true} />
      <main className={styles.main}>
        <div className={styles.headerArea}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{description}</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.listSection}>
            <h2 className={styles.sectionTitle}>Your {itemName}s</h2>
            {loading ? (
              <p className={styles.loadingText}>Loading...</p>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>No {itemName.toLowerCase()}s found. Add one below!</div>
            ) : (
              <ul className={styles.itemList}>
                {items.map(item => (
                  <li key={item.id || item.name} className={styles.itemCard}>
                    <div className={styles.itemName}>{item.name}</div>
                    {item.description && <div className={styles.itemDesc}>{item.description}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>Add New {itemName}</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input 
                  required
                  type="text" 
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className={styles.input}
                  placeholder={`e.g. ${itemName === 'Platform' ? 'Codeforces' : 'Dynamic Programming'}`}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className={styles.textarea}
                  placeholder="Optional description..."
                  rows={4}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>Save {itemName}</button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
