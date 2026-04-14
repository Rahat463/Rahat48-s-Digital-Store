/**
 * One-time script to index all products into ChromaDB.
 * Run: npx tsx src/scripts/buildEmbeddings.ts
 */
import { initDB } from '../db/database.js';
import { indexAllProducts } from '../services/embeddingService.js';

async function main() {
  console.log('Initializing database...');
  initDB();

  console.log('Indexing products into ChromaDB...');
  const count = await indexAllProducts();
  console.log(`Indexed ${count} products successfully.`);
}

main().catch((err) => {
  console.error('Failed to build embeddings:', err);
  process.exit(1);
});
