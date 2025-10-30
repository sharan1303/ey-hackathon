/**
 * Query Executor Service
 * 
 * This service manages the communication between server-side code that needs data
 * and the browser-based database. It sends query requests to the client via SSE
 * and receives results via a callback endpoint.
 * 
 * Architecture:
 * 1. Server code calls executeQuery(sql, params)
 * 2. Query executor sends 'query-request' event to client
 * 3. Client executes query in browser database
 * 4. Client POSTs result to /api/query-callback
 * 5. Query executor resolves promise with result
 * 6. Server code continues with the data
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

interface PendingQuery {
  resolve: (result: QueryResult) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  sql: string;
  params?: unknown[];
}

// Global storage for pending queries
const pendingQueries = new Map<string, PendingQuery>();

// Async local storage to store the encoder for streaming responses
interface QueryExecutorContext {
  encoder?: TextEncoder;
  controller?: ReadableStreamDefaultController<Uint8Array>;
  threadId?: string;
}

export const queryExecutorContext = new AsyncLocalStorage<QueryExecutorContext>();

const QUERY_TIMEOUT = 30000; // 30 seconds

/**
 * Generate a unique query ID
 */
function generateQueryId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Set the context for query execution (called from the API route)
 */
export function setQueryExecutorContext(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController<Uint8Array>,
  threadId: string
): void {
  const store = queryExecutorContext.getStore();
  if (store) {
    store.encoder = encoder;
    store.controller = controller;
    store.threadId = threadId;
  }
}

/**
 * Execute a SQL query by sending it to the browser client
 * Returns a promise that resolves when the client sends back the result
 */
export async function executeQuery(
  sql: string,
  params?: unknown[]
): Promise<QueryResult> {
  const context = queryExecutorContext.getStore();
  
  if (!context || !context.encoder || !context.controller) {
    throw new Error(
      'Query executor context not set. ' +
      'executeQuery must be called within a request that supports streaming.'
    );
  }

  const { encoder, controller } = context;
  const queryId = generateQueryId();

  console.log(`📤 Sending query request ${queryId}:`, sql.substring(0, 100));

  // Create a promise that will be resolved when the client sends back the result
  const resultPromise = new Promise<QueryResult>((resolve, reject) => {
    // Set up timeout
    const timeout = setTimeout(() => {
      pendingQueries.delete(queryId);
      reject(new Error(`Query timeout after ${QUERY_TIMEOUT}ms: ${sql.substring(0, 100)}`));
    }, QUERY_TIMEOUT);

    // Store the pending query
    pendingQueries.set(queryId, {
      resolve,
      reject,
      timeout,
      sql,
      params,
    });
  });

  // Send query request to client via SSE
  const event = {
    type: 'query-request',
    queryId,
    sql,
    params: params || [],
  };

  const eventStr = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(encoder.encode(eventStr));

  // Wait for the result
  return resultPromise;
}

/**
 * Handle query result from the client (called from the callback endpoint)
 */
export function handleQueryResult(
  queryId: string,
  result: QueryResult
): void {
  const pending = pendingQueries.get(queryId);
  
  if (!pending) {
    console.warn(`⚠️ Received result for unknown query: ${queryId}`);
    return;
  }

  console.log(`✅ Received query result for ${queryId}: ${result.values.length} rows`);

  // Clear timeout
  clearTimeout(pending.timeout);

  // Remove from pending queries
  pendingQueries.delete(queryId);

  // Resolve the promise
  pending.resolve(result);
}

/**
 * Handle query error from the client (called from the callback endpoint)
 */
export function handleQueryError(
  queryId: string,
  error: string
): void {
  const pending = pendingQueries.get(queryId);
  
  if (!pending) {
    console.warn(`⚠️ Received error for unknown query: ${queryId}`);
    return;
  }

  console.error(`❌ Query error for ${queryId}:`, error);

  // Clear timeout
  clearTimeout(pending.timeout);

  // Remove from pending queries
  pendingQueries.delete(queryId);

  // Reject the promise
  pending.reject(new Error(error));
}

/**
 * Get the number of pending queries (for monitoring)
 */
export function getPendingQueryCount(): number {
  return pendingQueries.size;
}

/**
 * Clear all pending queries (for cleanup)
 */
export function clearAllPendingQueries(): void {
  pendingQueries.forEach((pending) => {
    clearTimeout(pending.timeout);
    pending.reject(new Error('Query executor shutting down'));
  });
  pendingQueries.clear();
}

