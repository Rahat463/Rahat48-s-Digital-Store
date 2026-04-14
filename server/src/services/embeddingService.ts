import { chromaClient, COLLECTION_NAME } from '../config/chroma.js';
import { db } from '../db/database.js';
import type { Product, Review } from '../types/index.js';

/**
 * Build a rich text document from a product and its reviews.
 * This is what gets embedded — richer text = better semantic matches.
 */
function buildProductDocument(product: Product, reviews: Review[]): string {
  const parts = [
    product.name,
    product.description || '',
  ];

  if (reviews.length > 0) {
    const reviewTexts = reviews.map(r => {
      const prefix = r.title ? `${r.title}: ` : '';
      return `${prefix}${r.body} (${r.rating}/5)`;
    });
    parts.push('Reviews: ' + reviewTexts.join(' | '));
  }

  return parts.join('. ');
}

/**
 * Get or create the products collection in ChromaDB.
 */
async function getCollection() {
  return chromaClient.getOrCreateCollection({ name: COLLECTION_NAME });
}

/**
 * Upsert a single product's embedding into ChromaDB.
 */
async function upsertProduct(productId: number): Promise<void> {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Product | undefined;
  if (!product) return;

  const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ?').all(productId) as Review[];
  const document = buildProductDocument(product, reviews);

  const collection = await getCollection();
  await collection.upsert({
    ids: [`product_${product.id}`],
    documents: [document],
    metadatas: [{
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url || '',
    }],
  });
}

/**
 * Index all products into ChromaDB. Used by the build script
 * and can be called on server startup for a fresh index.
 */
async function indexAllProducts(): Promise<number> {
  const products = db.prepare('SELECT * FROM products').all() as Product[];
  const collection = await getCollection();

  const ids: string[] = [];
  const documents: string[] = [];
  const metadatas: Record<string, string | number>[] = [];

  for (const product of products) {
    const reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ?').all(product.id) as Review[];
    ids.push(`product_${product.id}`);
    documents.push(buildProductDocument(product, reviews));
    metadatas.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url || '',
    });
  }

  await collection.upsert({ ids, documents, metadatas });
  return products.length;
}

/**
 * Remove a product from the vector index.
 */
async function removeProduct(productId: number): Promise<void> {
  const collection = await getCollection();
  await collection.update({
    ids: [`product_${productId}`],
    documents: [''],
  });
}

/**
 * Semantic search: find products similar to a natural language query.
 */
async function searchProducts(query: string, limit: number = 5): Promise<{
  id: number;
  name: string;
  price: number;
  image_url: string;
  document: string;
  distance: number;
}[]> {
  const collection = await getCollection();
  const results = await collection.query({
    queryTexts: [query],
    nResults: limit,
  });

  const ids = results.ids?.[0];
  if (!ids || ids.length === 0) {
    return [];
  }

  const metadatas = results.metadatas?.[0] ?? [];
  const documents = results.documents?.[0] ?? [];
  const distances = results.distances?.[0] ?? [];

  return ids.map((_, i) => ({
    id: (metadatas[i]?.product_id as number) ?? 0,
    name: (metadatas[i]?.name as string) ?? '',
    price: (metadatas[i]?.price as number) ?? 0,
    image_url: (metadatas[i]?.image_url as string) ?? '',
    document: (documents[i] as string) ?? '',
    distance: distances[i] ?? 0,
  }));
}

export {
  buildProductDocument,
  getCollection,
  upsertProduct,
  indexAllProducts,
  removeProduct,
  searchProducts,
};
