import { executeQuery, QueryResult } from './query-executor';

/**
 * Execute a SQL query and return the results
 * This now uses the browser-based database via the query executor
 */
export async function query(sql: string, params?: unknown[]): Promise<QueryResult> {
  return executeQuery(sql, params);
}

/**
 * Execute a SQL query and return all rows as objects
 */
export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await executeQuery(sql, params);
  
  // Convert rows from arrays to objects
  return result.values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col: string, index: number) => {
      obj[col] = row[index];
    });
    return obj as T;
  });
}

/**
 * Execute a SQL query and return the first row as an object
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await executeQuery(sql, params);
  
  if (result.values.length === 0) {
    return null;
  }
  
  const obj: Record<string, unknown> = {};
  result.columns.forEach((col: string, index: number) => {
    obj[col] = result.values[0][index];
  });
  
  return obj as T;
}

// Helper to format dates for SQL
export function formatDateForSQL(date?: string): string | null {
  if (!date) return null;
  // Assume ISO format YYYY-MM-DD
  return date;
}

// Helper to get default date range (last 12 months)
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 12);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
}
