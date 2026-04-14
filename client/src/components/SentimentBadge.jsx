const colors = {
  positive: { bg: '#e8f5e9', color: '#2e7d32', label: 'Positive' },
  neutral: { bg: '#fff3e0', color: '#e65100', label: 'Neutral' },
  negative: { bg: '#ffebee', color: '#c62828', label: 'Negative' },
};

const styles = {
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  themes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '4px',
  },
  theme: {
    fontSize: '0.7rem',
    padding: '1px 6px',
    borderRadius: '8px',
    background: '#f5f5f5',
    color: '#666',
  },
};

export default function SentimentBadge({ sentiment, themes }) {
  if (!sentiment) return null;

  const config = colors[sentiment] || colors.neutral;
  let parsedThemes = [];
  try {
    parsedThemes = typeof themes === 'string' ? JSON.parse(themes) : themes || [];
  } catch {
    parsedThemes = [];
  }

  return (
    <div>
      <span style={{ ...styles.badge, background: config.bg, color: config.color }}>
        {config.label}
      </span>
      {parsedThemes.length > 0 && (
        <div style={styles.themes}>
          {parsedThemes.map((t, i) => (
            <span key={i} style={styles.theme}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
