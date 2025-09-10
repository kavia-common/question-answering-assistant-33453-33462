import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import { askQuestion, getHistory, getBackendBaseUrl } from './api';

// PUBLIC_INTERFACE
export default function App() {
  /**
   * Main Q&A application component.
   * - Displays a header
   * - Provides a centered question input form with submit button
   * - Shows most recent answer
   * - Shows a sidebar with question history (question + answer preview)
   * - Uses api.js to communicate with backend
   */
  const [theme, setTheme] = useState('light'); // default to light as requested
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]); // array of QARecord
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null); // currently displayed answer

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch initial history on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const h = await getHistory();
        if (mounted) {
          setHistory(h || []);
          if ((h || []).length > 0) {
            setActiveRecord(h[0]); // most recent first per API spec
          }
        }
      } catch (e) {
        if (mounted) {
          setError(readableError(e));
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Toggle between light and dark; default theme is light. */
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const backendInfo = useMemo(() => getBackendBaseUrl(), []);

  function readableError(e) {
    if (!e) return 'Unknown error';
    if (e.detail) return typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail);
    if (e.message) return e.message;
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const q = question.trim();
    if (!q) return;

    setLoading(true);
    try {
      const record = await askQuestion(q);
      // Prepend to history (most recent first)
      const next = [record, ...history];
      setHistory(next);
      setActiveRecord(record);
      setQuestion('');
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App">
      <header className="qa-header">
        <div className="brand">
          <div className="brand-logo" aria-hidden="true">Q</div>
          <div className="brand-text">
            <h1 className="app-title">Q&A Assistant</h1>
            <p className="app-subtitle">Ask anything. Get instant answers.</p>
          </div>
        </div>

        <div className="header-actions">
          <span className="backend-chip" title={`Backend base URL: ${backendInfo}`}>
            Backend: {backendInfo}
          </span>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </header>

      <main className="qa-main">
        <aside className="qa-sidebar" aria-label="Question history">
          <div className="sidebar-header">
            <h2>History</h2>
          </div>
          <ul className="history-list">
            {history.length === 0 && (
              <li className="history-empty">No history yet. Ask your first question!</li>
            )}
            {history.map((item) => (
              <li
                key={item.id ?? `${item.question}-${item.created_at ?? ''}`}
                className={
                  'history-item ' +
                  (activeRecord && (activeRecord.id === item.id || activeRecord.created_at === item.created_at)
                    ? 'active'
                    : '')
                }
                onClick={() => setActiveRecord(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') setActiveRecord(item);
                }}
              >
                <div className="history-question" title={item.question}>
                  {item.question}
                </div>
                <div className="history-answer" title={item.answer}>
                  {item.answer || '—'}
                </div>
                <div className="history-meta">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="qa-content">
          <form className="qa-form" onSubmit={handleSubmit} aria-label="Ask a question">
            <input
              className="qa-input"
              type="text"
              placeholder="Type your question here..."
              value={question}
              disabled={loading}
              onChange={(e) => setQuestion(e.target.value)}
              aria-label="Question"
            />
            <button className="qa-submit" type="submit" disabled={loading || question.trim().length === 0}>
              {loading ? 'Submitting...' : 'Ask'}
            </button>
          </form>

          {error && <div className="qa-error" role="alert">Error: {error}</div>}

          <div className="qa-answer-card">
            <div className="answer-header">
              <h2>Most Recent Answer</h2>
              {activeRecord?.created_at && (
                <span className="answer-ts">
                  {new Date(activeRecord.created_at).toLocaleString()}
                </span>
              )}
            </div>
            {activeRecord ? (
              <div className="answer-body">
                <div className="answer-question">
                  <span className="label">Q:</span> {activeRecord.question}
                </div>
                <div className="answer-text">
                  <span className="label a">A:</span> {activeRecord.answer}
                </div>
              </div>
            ) : (
              <div className="answer-empty">Ask a question to see the answer here.</div>
            )}
          </div>
        </section>
      </main>

      <footer className="qa-footer">
        <span>Built with ❤️ — Modern Light Theme</span>
      </footer>
    </div>
  );
}
