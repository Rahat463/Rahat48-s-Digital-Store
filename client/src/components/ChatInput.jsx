import { useState } from 'react';

const styles = {
  form: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    borderTop: '1px solid #e0e0e0',
    background: 'white',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '20px',
    border: '1px solid #ddd',
    fontSize: '0.88rem',
    outline: 'none',
  },
  button: {
    background: '#E2136E',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  buttonDisabled: {
    background: '#ccc',
    cursor: 'not-allowed',
  },
};

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setText('');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask me anything..."
        style={styles.input}
        disabled={disabled}
      />
      <button
        type="submit"
        style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : {}) }}
        disabled={disabled}
      >
        &#x27A4;
      </button>
    </form>
  );
}
