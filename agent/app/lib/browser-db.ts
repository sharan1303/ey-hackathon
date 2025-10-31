import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { loadSqlJs, type Database, type SqlJsStatic, type Statement } from './sql-loader';

// IndexedDB Schema
interface DatabaseCacheDB extends DBSchema {
  'database-files': {
    key: string;
    value: {
      name: string;
      data: Uint8Array;
      timestamp: number;
      size: number;
    };
  };
}

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

export interface DatabaseStatus {
  status: 'loading' | 'ready' | 'error';
  progress: number; // 0-100
  error?: string;
  cachedVersion?: boolean;
}

type StatusCallback = (status: DatabaseStatus) => void;
type QueryQueueItem = {
  sql: string;
  params?: unknown[];
  resolve: (result: QueryResult) => void;
  reject: (error: Error) => void;
};

const DB_NAME = 'voltura_data_cleaned.db';
const DB_URL = '/voltura_data_cleaned.db';
const CACHE_NAME = 'voltura-db-cache';
const CACHE_VERSION = 1;

class BrowserDatabase {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private idb: IDBPDatabase<DatabaseCacheDB> | null = null;
  private status: DatabaseStatus = { status: 'loading', progress: 0 };
  private statusCallbacks: Set<StatusCallback> = new Set();
  private queryQueue: QueryQueueItem[] = [];
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize on construction
    this.initPromise = this.initialize();
  }

  /**
   * Subscribe to database status updates
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.status);
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Update status and notify all subscribers
   */
  private updateStatus(status: Partial<DatabaseStatus>) {
    this.status = { ...this.status, ...status };
    this.statusCallbacks.forEach(callback => callback(this.status));
  }

  /**
   * Initialize IndexedDB for caching
   */
  private async initIndexedDB(): Promise<void> {
    try {
      this.idb = await openDB<DatabaseCacheDB>(CACHE_NAME, CACHE_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('database-files')) {
            db.createObjectStore('database-files', { keyPath: 'name' });
          }
        },
      });
    } catch (error) {
      console.warn('Failed to initialize IndexedDB for caching:', error);
      // Continue without caching
    }
  }

  /**
   * Check if database is cached in IndexedDB
   */
  private async getCachedDatabase(): Promise<Uint8Array | null> {
    if (!this.idb) return null;

    try {
      const cached = await this.idb.get('database-files', DB_NAME);
      if (cached) {
        console.log(`✅ Found cached database (${(cached.size / 1024 / 1024).toFixed(2)} MB)`);
        return cached.data;
      }
    } catch (error) {
      console.warn('Failed to read cached database:', error);
    }

    return null;
  }

  /**
   * Cache database in IndexedDB
   */
  private async cacheDatabase(data: Uint8Array): Promise<void> {
    if (!this.idb) return;

    try {
      await this.idb.put('database-files', {
        name: DB_NAME,
        data,
        timestamp: Date.now(),
        size: data.byteLength,
      });
      console.log('✅ Database cached in IndexedDB');
    } catch (error) {
      console.warn('Failed to cache database:', error);
    }
  }

  /**
   * Download database file with progress tracking
   */
  private async downloadDatabase(): Promise<Uint8Array> {
    console.log('📥 Downloading database file...');

    const response = await fetch(DB_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to download database: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      received += value.length;

      // Update progress
      if (total > 0) {
        const progress = Math.round((received / total) * 100);
        this.updateStatus({ progress });
      }
    }

    // Concatenate all chunks
    const data = new Uint8Array(received);
    let position = 0;
    for (const chunk of chunks) {
      data.set(chunk, position);
      position += chunk.length;
    }

    console.log(`✅ Downloaded ${(received / 1024 / 1024).toFixed(2)} MB`);
    return data;
  }

  /**
   * Initialize the database
   */
  private async initialize(): Promise<void> {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      throw new Error('BrowserDatabase can only be used in the browser');
    }

    try {
      console.log('🗄️ Initializing browser database...');
      this.updateStatus({ status: 'loading', progress: 0 });

      // Step 1: Initialize SQL.js (5% progress)
      console.log('📦 Loading SQL.js from CDN...');
      // Load SQL.js from CDN to avoid npm package bundler issues
      const initSqlJs = await loadSqlJs();
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
      });
      this.updateStatus({ progress: 5 });
      console.log('✅ SQL.js loaded');

      // Step 2: Initialize IndexedDB for caching (10% progress)
      await this.initIndexedDB();
      this.updateStatus({ progress: 10 });

      // Step 3: Try to get cached database (15% progress)
      let dbData = await this.getCachedDatabase();
      
      if (dbData) {
        this.updateStatus({ progress: 90, cachedVersion: true });
      } else {
        // Step 4: Download database if not cached (15-90% progress)
        dbData = await this.downloadDatabase();
        
        // Step 5: Cache the downloaded database
        await this.cacheDatabase(dbData);
      }

      // Step 6: Initialize SQL.js database (95% progress)
      this.updateStatus({ progress: 95 });
      this.db = new this.SQL.Database(dbData);
      console.log('✅ Database initialized');

      // Step 7: Complete! (100% progress)
      this.updateStatus({ status: 'ready', progress: 100 });
      
      // Process queued queries
      this.processQueryQueue();
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus({ 
        status: 'error', 
        error: errorMessage 
      });
      
      // Reject all queued queries
      this.queryQueue.forEach(item => {
        item.reject(new Error('Database initialization failed'));
      });
      this.queryQueue = [];
    }
  }

  /**
   * Process all queued queries
   */
  private processQueryQueue(): void {
    if (this.status.status !== 'ready' || !this.db) return;

    console.log(`Processing ${this.queryQueue.length} queued queries`);
    
    while (this.queryQueue.length > 0) {
      const item = this.queryQueue.shift();
      if (!item) continue;

      try {
        const result = this.executeQuerySync(item.sql, item.params);
        item.resolve(result);
      } catch (error) {
        item.reject(error instanceof Error ? error : new Error('Query execution failed'));
      }
    }
  }

  /**
   * Execute a query synchronously (internal use only)
   */
  private executeQuerySync(sql: string, params?: unknown[]): QueryResult {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      
      if (params && params.length > 0) {
        // Cast params to SqlValue[] for sql.js compatibility
        stmt.bind(params as (string | number | null | Uint8Array)[]);
      }

      const columns: string[] = stmt.getColumnNames();
      const values: unknown[][] = [];

      while (stmt.step()) {
        const row = stmt.get();
        values.push(row);
      }

      stmt.free();

      return { columns, values };
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query
   * If database is not ready, the query will be queued
   */
  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    // If database is ready, execute immediately
    if (this.status.status === 'ready' && this.db) {
      return this.executeQuerySync(sql, params);
    }

    // If database failed to initialize, reject immediately
    if (this.status.status === 'error') {
      throw new Error(this.status.error || 'Database initialization failed');
    }

    // Otherwise, queue the query
    return new Promise<QueryResult>((resolve, reject) => {
      this.queryQueue.push({ sql, params, resolve, reject });
      
      // Make sure initialization is running
      if (!this.initPromise) {
        this.initPromise = this.initialize();
      }
    });
  }

  /**
   * Get current database status
   */
  getStatus(): DatabaseStatus {
    return { ...this.status };
  }

  /**
   * Wait for database to be ready
   */
  async waitForReady(): Promise<void> {
    if (this.status.status === 'ready') return;
    if (this.status.status === 'error') {
      throw new Error(this.status.error || 'Database initialization failed');
    }

    return new Promise((resolve, reject) => {
      const unsubscribe = this.onStatusChange((status) => {
        if (status.status === 'ready') {
          unsubscribe();
          resolve();
        } else if (status.status === 'error') {
          unsubscribe();
          reject(new Error(status.error || 'Database initialization failed'));
        }
      });
    });
  }

  /**
   * Clear cached database (for development/debugging)
   */
  async clearCache(): Promise<void> {
    if (this.idb) {
      try {
        await this.idb.delete('database-files', DB_NAME);
        console.log('✅ Database cache cleared');
      } catch (error) {
        console.error('Failed to clear cache:', error);
      }
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    if (this.idb) {
      this.idb.close();
      this.idb = null;
    }
  }
}

// Singleton instance
let browserDB: BrowserDatabase | null = null;

/**
 * Get the browser database instance (singleton)
 */
export function getBrowserDatabase(): BrowserDatabase {
  if (!browserDB) {
    browserDB = new BrowserDatabase();
  }
  return browserDB;
}

/**
 * Execute a query on the browser database
 */
export async function executeQuery(sql: string, params?: unknown[]): Promise<QueryResult> {
  const db = getBrowserDatabase();
  return db.query(sql, params);
}

/**
 * Get database status
 */
export function getDatabaseStatus(): DatabaseStatus {
  const db = getBrowserDatabase();
  return db.getStatus();
}

/**
 * Subscribe to database status changes
 */
export function onDatabaseStatusChange(callback: StatusCallback): () => void {
  const db = getBrowserDatabase();
  return db.onStatusChange(callback);
}

