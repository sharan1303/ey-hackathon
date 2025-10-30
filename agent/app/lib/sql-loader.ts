/**
 * Client-side SQL.js loader using CDN
 * This bypasses the npm package to avoid bundler issues
 */

// Define types locally
interface Statement {
  bind(params?: unknown[]): boolean;
  step(): boolean;
  get(): unknown[];
  getColumnNames(): string[];
  free(): void;
}

interface Database {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
  prepare(sql: string): Statement;
  export(): Uint8Array;
  close(): void;
}

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => Database;
}

type InitSqlJs = (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>;

let sqlJsPromise: Promise<InitSqlJs> | null = null;

/**
 * Load SQL.js from CDN (bypasses npm package to avoid build issues)
 */
export async function loadSqlJs(): Promise<InitSqlJs> {
  if (typeof window === 'undefined') {
    throw new Error('SQL.js can only be loaded in the browser');
  }

  // Cache the promise to avoid loading multiple times
  if (sqlJsPromise) {
    return sqlJsPromise;
  }

  sqlJsPromise = (async () => {
    // Load SQL.js from CDN
    const script = document.createElement('script');
    script.src = 'https://sql.js.org/dist/sql-wasm.js';
    
    const loadPromise = new Promise<InitSqlJs>((resolve, reject) => {
      script.onload = () => {
        // @ts-expect-error - initSqlJs is loaded from CDN
        if (window.initSqlJs) {
          // @ts-expect-error - initSqlJs is loaded from CDN
          resolve(window.initSqlJs as InitSqlJs);
        } else {
          reject(new Error('Failed to load initSqlJs from CDN'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load SQL.js script'));
    });

    document.head.appendChild(script);
    return loadPromise;
  })();

  return sqlJsPromise;
}

export type { Database, SqlJsStatic, Statement };

