import Database from 'better-sqlite3';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

// Get the directory of the current module
const file = fileURLToPath(import.meta.url);
const dir = dirname(file);

// Database connection - path relative to this file, not process.cwd()
// From /agent/app/api/src/mastra/lib/ -> 6 levels up to /ey-hackathon/ then /data/
let DB_PATH = process.env.DATABASE_PATH || path.join(dir, '../../../../../../data/voltura_data_cleaned.db');

// Resolve to absolute path and verify it exists
DB_PATH = resolve(DB_PATH);

// Debug logging for troubleshooting
if (!existsSync(DB_PATH)) {
  console.error('❌ Database file not found at:', DB_PATH);
  console.error('Current module dir:', dir);
  console.error('Trying alternative paths...');
  
  // Try alternative path calculations
  const alternatives = [
    resolve(dir, '../../../../../../data/voltura_data_cleaned.db'),
    resolve(process.cwd(), '../data/voltura_data_cleaned.db'),
    resolve(process.cwd(), '../../data/voltura_data_cleaned.db'),
    '/Users/Sharan.Umavassee/Source/ey-hackathon/data/voltura_data_cleaned.db'
  ];
  
  for (const altPath of alternatives) {
    if (existsSync(altPath)) {
      console.log('✅ Found database at:', altPath);
      DB_PATH = altPath;
      break;
    }
  }
  
  if (!existsSync(DB_PATH)) {
    throw new Error(`Database file not found. Searched: ${DB_PATH}`);
  }
} else {
  console.log('✅ Database found at:', DB_PATH);
}

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
