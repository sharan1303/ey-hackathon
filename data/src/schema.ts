import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

/**
 * Database schema manager
 * Loads and applies the SQL schema to the database
 */
export class SchemaManager {
  private db: Database.Database;
  private schemaPath: string;

  constructor(db: Database.Database) {
    this.db = db;
    this.schemaPath = path.join(__dirname, '..', '..', 'data', 'schema','schema.sql');
  }

  /**
   * Apply the schema from schema.sql file
   */
  applySchema(): void {
    console.log('\n=== Applying Database Schema ===\n');

    if (!fs.existsSync(this.schemaPath)) {
      throw new Error(`Schema file not found at: ${this.schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(this.schemaPath, 'utf-8');
    
    try {
      // Execute the entire schema
      this.db.exec(schemaSQL);
      console.log('✓ Database schema applied successfully');
      
      // Verify tables were created
      this.verifySchema();
    } catch (error) {
      console.error('✗ Error applying schema:', error);
      throw error;
    }
  }

  /**
   * Verify that all expected tables exist
   */
  private verifySchema(): void {
    const expectedTables = [
      'catalogue_prices',
      'landed_costs',
      'sales',
      'customer_product_keys',
      'pallet_sizes'
    ];

    const expectedViews = [
      'vw_product_pricing',
      'vw_sales_by_customer',
      'vw_sales_by_product',
      'vw_monthly_sales'
    ];

    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    const views = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='view'"
    ).all() as { name: string }[];

    console.log('\nTables created:');
    expectedTables.forEach(tableName => {
      const exists = tables.some(t => t.name === tableName);
      console.log(`  ${exists ? '✓' : '✗'} ${tableName}`);
    });

    console.log('\nViews created:');
    expectedViews.forEach(viewName => {
      const exists = views.some(v => v.name === viewName);
      console.log(`  ${exists ? '✓' : '✗'} ${viewName}`);
    });

    // Verify indexes
    const indexes = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    console.log(`\nIndexes created: ${indexes.length}`);
    indexes.forEach(idx => {
      console.log(`  ✓ ${idx.name}`);
    });
  }

  /**
   * Get table information
   */
  getTableInfo(tableName: string): any[] {
    return this.db.prepare(`PRAGMA table_info(${tableName})`).all();
  }

  /**
   * Get database statistics
   */
  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    const tables = ['catalogue_prices', 'landed_costs', 'sales', 'customer_product_keys', 'pallet_sizes'];
    
    tables.forEach(table => {
      const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      stats[table] = result.count;
    });

    return stats;
  }

  /**
   * Drop all tables (use with caution!)
   */
  dropAllTables(): void {
    console.log('\n⚠️  Dropping all tables...');
    
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all() as { name: string }[];

    const views = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='view'"
    ).all() as { name: string }[];

    // Drop views first
    views.forEach(view => {
      this.db.exec(`DROP VIEW IF EXISTS ${view.name}`);
      console.log(`  ✓ Dropped view: ${view.name}`);
    });

    // Drop tables
    tables.forEach(table => {
      this.db.exec(`DROP TABLE IF EXISTS ${table.name}`);
      console.log(`  ✓ Dropped table: ${table.name}`);
    });
  }
}


