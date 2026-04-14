const styles = {
  message: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
    maxWidth: '85%',
  },
  userMessage: {
    marginLeft: 'auto',
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  userAvatar: {
    background: '#E2136E',
    color: 'white',
  },
  botAvatar: {
    background: '#3b82f6',
    color: 'white',
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  userBubble: {
    background: '#E2136E',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  botBubble: {
    background: '#f0f0f0',
    color: '#333',
    borderBottomLeftRadius: '4px',
  },
  toolInfo: {
    fontSize: '0.75rem',
    color: '#888',
    padding: '4px 10px',
    background: '#f8f8f8',
    borderRadius: '6px',
    marginBottom: '6px',
    border: '1px dashed #ddd',
  },
  toolName: {
    color: '#3b82f6',
    fontWeight: 600,
  },
};

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{ ...styles.message, ...(isUser ? styles.userMessage : {}) }}>
      <div style={{ ...styles.avatar, ...(isUser ? styles.userAvatar : styles.botAvatar) }}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div>
        {message.tools && message.tools.map((tool, i) => (
          <div key={i} style={styles.toolInfo}>
            Used <span style={styles.toolName}>{tool.replace(/_/g, ' ')}</span>
          </div>
        ))}
        <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : styles.botBubble) }}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
