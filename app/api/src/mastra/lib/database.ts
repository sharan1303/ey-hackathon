import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const dbFilename = fileURLToPath(import.meta.url);
const dbDirname = path.dirname(dbFilename);

// Database connection
const DB_PATH = process.env.DATABASE_PATH || path.join(dbDirname, '../../../data/voltura_data_cleaned.db');
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
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

// Close database on process exit
process.on('exit', () => {
  if (db) {
    db.close();
  }
});
