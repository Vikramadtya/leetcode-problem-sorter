import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Edit2, Save, X, ArrowLeft } from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';

import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

import SEO from '../components/SEO';
import Header from '../components/Header';
import { apiClient } from '../lib/api/apiClient';

import styles from './NotePage.module.css';

interface Question {
  id: string;
  title: string;
  progress?: {
    notes?: string;
  };
}

export default function NotePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Raw markdown string (includes frontmatter)
  const [rawNotes, setRawNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .getQuestionById(id)
      .then((res: any) => {
        if (res.question) {
          setQuestion(res.question);
          setRawNotes(res.question.progress?.notes || '');
        }
      })
      .catch(() => {
        navigate('/'); // Go back if not found
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    if (!question) return;
    try {
      let tagsToSave: string[] | undefined = undefined;
      try {
        const trimmed = rawNotes.trimStart();
        const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
        if (match) {
          const frontmatter = match[1];
          let tags: string[] = [];
          const lines = frontmatter.split(/\r?\n/);
          let inTags = false;
          for (const line of lines) {
            if (line.trim() === 'tags:') {
              inTags = true;
              continue;
            }
            if (inTags) {
              if (line.trim().startsWith('-')) {
                tags.push(line.replace(/^\s*-\s*/, '').trim());
              } else if (line.trim() !== '') {
                inTags = false;
              }
            }
          }
          if (tags.length > 0) {
            tagsToSave = tags;
          }
        }
      } catch(e) {}
      
      await apiClient.updateProgress(question.id, { 
        notes: rawNotes,
        ...(tagsToSave !== undefined && { tags: tagsToSave })
      });
      toast.success('Notes saved successfully');
      setIsEditing(false);
      // Update local state
      setQuestion(prev => prev ? {
        ...prev,
        progress: { ...prev.progress, notes: rawNotes }
      } : prev);
    } catch (e) {
      // Error handled in apiClient
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header authEnabled={true} />
        <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading note...</div>
      </div>
    );
  }

  if (!question) return null;

  // Parse frontmatter (custom browser-safe parser)
  let content = rawNotes;
  let data: any = {};
  
  try {
    const trimmed = rawNotes.trimStart();
    const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (match) {
      const frontmatter = match[1];
      content = match[2];
      
      let tags: string[] = [];
      const lines = frontmatter.split(/\r?\n/);
      let inTags = false;
      for (const line of lines) {
        if (line.trim() === 'tags:') {
          inTags = true;
          continue;
        }
        if (inTags) {
          if (line.trim().startsWith('-')) {
            tags.push(line.replace(/^\s*-\s*/, '').trim());
          } else if (line.trim() !== '') {
            inTags = false;
          }
        }
      }
      data.tags = tags;
    }
  } catch (e) {
    content = rawNotes;
  }

  const tags = Array.isArray(data.tags) ? data.tags : [];

  return (
    <>
      <SEO title={`${question.title} Notes | Tacker`} />
      <div className={styles.container}>
        <Header authEnabled={true} />
        <main className={styles.main}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button 
                onClick={() => navigate('/')} 
                className={styles.cancelBtn} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: 0, marginBottom: '8px' }}
              >
                <ArrowLeft size={16} /> Back to Tracker
              </button>
              <h1 className={styles.title}>{question.title}</h1>
              
              {/* Display Frontmatter Tags */}
              {!isEditing && tags.length > 0 && (
                <div className={styles.meta}>
                  {tags.map((tag, idx) => (
                    <span key={idx} className={styles.badge}>#{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              {isEditing ? (
                <>
                  <button className={styles.cancelBtn} onClick={() => {
                    setIsEditing(false);
                    setRawNotes(question.progress?.notes || ''); // Reset
                  }}>
                    <X size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Cancel
                  </button>
                  <button className={styles.saveBtn} onClick={handleSave}>
                    <Save size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Save
                  </button>
                </>
              ) : (
                <button className={styles.editBtn} onClick={() => setIsEditing(true)}>
                  <Edit2 size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Edit Note
                </button>
              )}
            </div>
          </div>

          <div className={styles.content}>
            {isEditing ? (
              <div className={styles.editorContainer}>
                <CodeMirror
                  value={rawNotes}
                  minHeight="500px"
                  extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                  theme={vscodeDark}
                  onChange={(val) => setRawNotes(val)}
                  className={styles.codeMirror}
                  autoFocus
                />
              </div>
            ) : (
              <div className={styles.markdownBody}>
                {content.trim() ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            {...props}
                            children={String(children).replace(/\n$/, '')}
                            style={vscDarkPlus as any}
                            language={match[1]}
                            PreTag="div"
                          />
                        ) : (
                          <code {...props} className={className}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {DOMPurify.sanitize(content)}
                  </ReactMarkdown>
                ) : (
                  <div className={styles.emptyState}>
                    No notes yet. Click 'Edit Note' to add your approach.
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
