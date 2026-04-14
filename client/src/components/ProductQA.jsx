import { useState, useRef, useEffect } from 'react';
import { askProductQuestion } from '../services/api';

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  heading: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  form: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    fontSize: '0.95rem',
    outline: 'none',
  },
  button: {
    background: '#E2136E',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
  answer: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '16px',
    lineHeight: '1.6',
    fontSize: '0.95rem',
    whiteSpace: 'pre-wrap',
  },
  sources: {
    marginTop: '12px',
    padding: '12px',
    background: '#fff0f5',
    borderRadius: '8px',
    borderLeft: '3px solid #E2136E',
  },
  sourcesTitle: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#E2136E',
    marginBottom: '6px',
  },
  sourceItem: {
    fontSize: '0.85rem',
    color: '#555',
    padding: '2px 0',
  },
  error: {
    color: '#d32f2f',
    padding: '12px',
    background: '#ffebee',
    borderRadius: '8px',
  },
  examples: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '16px',
  },
  exampleBtn: {
    background: '#f0f0f0',
    border: '1px solid #e0e0e0',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#555',
  },
};

const EXAMPLE_QUESTIONS = [
  'Which course is best for beginners?',
  'Compare React and Node.js courses',
  'What helps with coding interviews?',
  'What can I learn for data science?',
];

export default function ProductQA() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const answerRef = useRef(null);

  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [answer]);

  async function handleAsk(q) {
    const queryText = q || question.trim();
    if (!queryText) return;

    setLoading(true);
    setAnswer('');
    setSources(null);
    setError(null);

    try {
      await askProductQuestion(queryText, (chunk) => {
        if (chunk.type === 'sources') {
          setSources(JSON.parse(chunk.data));
        } else if (chunk.type === 'text') {
          setAnswer((prev) => prev + chunk.data);
        } else if (chunk.type === 'error') {
          setError(chunk.data);
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    handleAsk();
  }

  return (
    <div style={styles.container}>
      <div style={styles.heading}>Ask about our products</div>

      <div style={styles.examples}>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            style={styles.exampleBtn}
            onClick={() => {
              setQuestion(q);
              handleAsk(q);
            }}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about our products..."
          style={styles.input}
          disabled={loading}
        />
        <button
          type="submit"
          style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
          disabled={loading}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {error && <div style={styles.error}>{error}</div>}

      {answer && (
        <div ref={answerRef} style={styles.answer}>
          {answer}
        </div>
      )}

      {sources && sources.length > 0 && (
        <div style={styles.sources}>
          <div style={styles.sourcesTitle}>Sources used:</div>
          {sources.map((s) => (
            <div key={s.id} style={styles.sourceItem}>
              {s.name} — {s.price} BDT ({s.relevance}% relevant)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
