import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { sendChatMessage } from '../services/api';

const styles = {
  fab: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: '#E2136E',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.5rem',
    boxShadow: '0 4px 16px rgba(226,19,110,0.4)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s',
  },
  panel: {
    position: 'fixed',
    bottom: '90px',
    right: '24px',
    width: '380px',
    maxHeight: '520px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 16px',
    background: '#E2136E',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: 700,
    fontSize: '0.95rem',
  },
  headerSubtitle: {
    fontSize: '0.72rem',
    opacity: 0.8,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '4px',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 12px',
    minHeight: '200px',
    maxHeight: '380px',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    fontSize: '0.85rem',
    padding: '40px 20px',
  },
  suggestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '0 12px 12px',
  },
  suggestion: {
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    padding: '5px 10px',
    borderRadius: '14px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    color: '#555',
  },
  typing: {
    padding: '8px 14px',
    fontSize: '0.82rem',
    color: '#999',
    fontStyle: 'italic',
  },
};

const SUGGESTIONS = [
  'What courses do you have?',
  'Recommend something for beginners',
  'What helps with interviews?',
  'Tell me about the React course',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(text) {
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    let botText = '';
    const toolsUsed = [];

    try {
      await sendChatMessage(text, (chunk) => {
        if (chunk.type === 'text') {
          botText += chunk.data;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: botText, tools: [...toolsUsed] };
            } else {
              updated.push({ role: 'assistant', content: botText, tools: [...toolsUsed] });
            }
            return updated;
          });
        } else if (chunk.type === 'tool_use') {
          const parsed = JSON.parse(chunk.data);
          toolsUsed.push(parsed.tool);
        } else if (chunk.type === 'error') {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Error: ${chunk.data}` },
          ]);
        }
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Connection error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        style={styles.fab}
        onClick={() => setOpen(!open)}
        title="Chat with AI Assistant"
      >
        {open ? '\u2715' : '\uD83D\uDCAC'}
      </button>

      {/* Chat Panel */}
      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <div>
              <div style={styles.headerTitle}>Store Assistant</div>
              <div style={styles.headerSubtitle}>Powered by Claude AI</div>
            </div>
            <button style={styles.closeBtn} onClick={() => setOpen(false)}>
              \u2715
            </button>
          </div>

          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.empty}>
                Hi! I can help you find products, check orders, and more. Try asking something below.
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && (
              <div style={styles.typing}>Thinking...</div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 0 && (
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  style={styles.suggestion}
                  onClick={() => handleSend(s)}
                  disabled={loading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <ChatInput onSend={handleSend} disabled={loading} />
        </div>
      )}
    </>
  );
}
