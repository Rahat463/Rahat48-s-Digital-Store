import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import { db } from '../db/database.js';

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  key_themes: string[];
}

/**
 * Analyze the sentiment of a review and store the results.
 * Runs asynchronously after review creation.
 */
async function analyzeReviewSentiment(reviewId: number, body: string, title?: string | null): Promise<void> {
  if (!anthropic) return;

  try {
    const text = title ? `${title}: ${body}` : body;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: 'You analyze product review sentiment. Respond with ONLY valid JSON, no other text.',
      messages: [{
        role: 'user',
        content: `Analyze this product review and return JSON with exactly these fields:
- "sentiment": one of "positive", "neutral", or "negative"
- "score": a number from -1.0 (very negative) to 1.0 (very positive)
- "key_themes": an array of 1-3 short theme strings (e.g., "good value", "hard content")

Review: "${text}"`,
      }],
    });

    const responseText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    const result = JSON.parse(responseText) as SentimentResult;

    db.prepare(`
      UPDATE reviews
      SET sentiment = ?, sentiment_score = ?, key_themes = ?
      WHERE id = ?
    `).run(
      result.sentiment,
      result.score,
      JSON.stringify(result.key_themes),
      reviewId
    );
  } catch {
    // Sentiment analysis is non-critical — don't block on failure
  }
}

export { analyzeReviewSentiment };
