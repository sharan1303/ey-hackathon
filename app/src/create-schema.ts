import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { SchemaManager } from './schema';

const DB_PATH = path.join(__dirname, '..', '..', 'voltura_data.db');

/**
 * Prompts user for confirmation
 */
function promptConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Standalone script to create/update database schema
 * Run this before importing data or to reset the database structure
 */
class SchemaCreator {
  private db: Database.Database;
  private schemaManager: SchemaManager;

  constructor(resetDatabase: boolean = false) {
    // Remove existing database if reset flag is set
    if (resetDatabase && fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('⚠️  Removed existing database');
    }

    this.db = new Database(DB_PATH);
    console.log(`📁 Database: ${DB_PATH}`);
    
    this.schemaManager = new SchemaManager(this.db);
  }

  createSchema() {
    console.log('\n🔨 Creating database schema...\n');
    
    try {
      this.schemaManager.applySchema();
      
      console.log('\n📊 Database Statistics:');
      const stats = this.schemaManager.getStats();
      Object.entries(stats).forEach(([table, count]) => {
        console.log(`  ${table}: ${count} records`);
      });

      console.log('\n✅ Schema creation complete!');
      console.log('\n💡 Next steps:');
      console.log('   1. Run "pnpm run dev" to import data');
      console.log('   2. Run "pnpm run query" to test queries\n');
    } catch (error) {
      console.error('\n❌ Error creating schema:', error);
      process.exit(1);
    } finally {
      this.db.close();
    }
  }

  async resetSchema() {
    console.log('\n⚠️  WARNING: This will delete ALL tables and data in the database!\n');
    
    const confirmed = await promptConfirmation('Are you sure you want to reset the schema? Type "yes" to confirm: ');
    
    if (!confirmed) {
      console.log('\n❌ Reset cancelled by user.\n');
      this.db.close();
      process.exit(0);
    }
    
    console.log('\n🔨 Resetting database schema...\n');
    
    try {
      this.schemaManager.dropAllTables();
      this.schemaManager.applySchema();
      
      console.log('\n✅ Schema reset complete!\n');
    } catch (error) {
      console.error('\n❌ Error resetting schema:', error);
      process.exit(1);
    } finally {
      this.db.close();
    }
  }

  showInfo() {
    console.log('\n📋 Database Information:\n');
    
    const tables = ['catalogue_prices', 'landed_costs', 'sales', 'customer_product_keys', 'pallet_sizes'];
    
    tables.forEach(tableName => {
      console.log(`\n${tableName}:`);
      const info = this.schemaManager.getTableInfo(tableName);
      info.forEach((col: any) => {
        console.log(`  - ${col.name} (${col.type})${col.pk ? ' [PRIMARY KEY]' : ''}`);
      });
    });

    this.db.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'create';

(async () => {
  switch (command) {
    case 'create':
      new SchemaCreator(false).createSchema();
      break;
    
    case 'reset':
      await new SchemaCreator(true).resetSchema();
      break;
    
    case 'info':
      new SchemaCreator(false).showInfo();
      break;
    
    default:
      console.log(`
Usage: pnpm run schema [command]

Commands:
  create   - Create schema (default, keeps existing data)
  reset    - Drop all tables and recreate schema (requires confirmation)
  info     - Show database table information

Examples:
  pnpm run schema         # Create schema
  pnpm run schema reset   # Reset schema (⚠️ deletes all data)
  pnpm run schema info    # Show schema info
      `);
      process.exit(1);
  }
})();


