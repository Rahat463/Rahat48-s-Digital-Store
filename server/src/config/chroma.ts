import { ChromaClient } from 'chromadb';

const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = parseInt(process.env.CHROMA_PORT || '8000', 10);
const COLLECTION_NAME = 'products';

const chromaClient = new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });

export { chromaClient, COLLECTION_NAME };
