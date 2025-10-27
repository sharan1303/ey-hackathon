import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import * as xlsx from 'xlsx';
import { SchemaManager } from './schema';

const DB_PATH = path.join(__dirname, '..', '..', 'voltura_data.db');
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

interface CsvRow {
  [key: string]: string;
}

class DataImporter {
  private db: Database.Database;
  private schemaManager: SchemaManager;

  constructor(private resetMode: boolean = false) {
    // Only remove database if explicitly in reset mode
    if (resetMode && fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('⚠️  Removed existing database (reset mode)');
    }

    this.db = new Database(DB_PATH);
    console.log(`📁 Database: ${DB_PATH}`);
    
    this.schemaManager = new SchemaManager(this.db);
  }

  private ensureSchema() {
    // Check if tables exist
    const tables = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='catalogue_prices'"
    ).get();

    if (!tables) {
      console.log('\n🔨 Creating database schema...');
      this.schemaManager.applySchema();
    } else if (this.resetMode) {
      console.log('\n🔨 Resetting database schema...');
      this.schemaManager.dropAllTables();
      this.schemaManager.applySchema();
    } else {
      console.log('\n✓ Database schema already exists');
    }
  }

  private checkExistingData(): boolean {
    try {
      const result = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
      return result.count > 0;
    } catch {
      return false;
    }
  }

  private async importCsvFile(
    filePath: string,
    tableName: string,
    columnMapping: { [key: string]: string }
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const rows: CsvRow[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: CsvRow) => {
          rows.push(row);
        })
        .on('end', () => {
          if (rows.length === 0) {
            console.log(`  No data found in ${path.basename(filePath)}`);
            resolve(0);
            return;
          }

          // Filter out empty rows (where all values are empty)
          const validRows = rows.filter(row => {
            return Object.values(row).some(val => val && val.trim() !== '');
          });

          if (validRows.length === 0) {
            console.log(`  No valid data found in ${path.basename(filePath)}`);
            resolve(0);
            return;
          }

          const columns = Object.keys(columnMapping);
          const placeholders = columns.map(() => '?').join(', ');
          const columnNames = columns.join(', ');
          
          const insertStmt = this.db.prepare(
            `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`
          );

          const insertMany = this.db.transaction((rows: CsvRow[]) => {
            for (const row of rows) {
              const values = columns.map(col => {
                const value = row[columnMapping[col]];
                // Convert empty strings to null, and try to parse numbers
                if (!value || value.trim() === '') return null;
                const num = parseFloat(value);
                return isNaN(num) ? value : num;
              });
              insertStmt.run(...values);
            }
          });

          insertMany(validRows);
          resolve(validRows.length);
        })
        .on('error', reject);
    });
  }

  private async importSalesData(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const rows: CsvRow[] = [];
      
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row: CsvRow) => {
          rows.push(row);
        })
        .on('end', () => {
          if (rows.length === 0) {
            console.log(`  No data found in ${path.basename(filePath)}`);
            resolve(0);
            return;
          }

          // Filter out empty rows
          const validRows = rows.filter(row => {
            return Object.values(row).some(val => val && val.trim() !== '');
          });

          if (validRows.length === 0) {
            console.log(`  No valid data found in ${path.basename(filePath)}`);
            resolve(0);
            return;
          }

          const insertStmt = this.db.prepare(`
            INSERT INTO sales (
              invoice_number, invoice_date, customer_code, customer_name,
              item_code, quantity, unit_price, discount_percent, line_total
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertMany = this.db.transaction((rows: CsvRow[]) => {
            for (const row of rows) {
              const invoiceNumber = row['Document Number'] || null;
              const invoiceDateRaw = row['Document Date'];
              const customerCode = row['Customer Code'] || null;
              const customerName = row['Customer Name'] || null;
              const itemCode = row['Item SKU'] || null;
              const quantityStr = row['Item Quantity'];
              const priceStr = row['Price'];
              
              // Convert date from DD/MM/YYYY to YYYY-MM-DD
              let invoiceDate = null;
              if (invoiceDateRaw && invoiceDateRaw.trim() !== '') {
                const dateParts = invoiceDateRaw.trim().split('/');
                if (dateParts.length === 3) {
                  const [day, month, year] = dateParts;
                  // Convert to YYYY-MM-DD format
                  invoiceDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
              
              // Parse numbers
              const quantity = quantityStr && quantityStr.trim() !== '' ? parseFloat(quantityStr) : null;
              const unitPrice = priceStr && priceStr.trim() !== '' ? parseFloat(priceStr) : null;
              
              // Calculate line total
              const lineTotal = (quantity !== null && unitPrice !== null) 
                ? quantity * unitPrice 
                : null;
              
              insertStmt.run(
                invoiceNumber,
                invoiceDate,
                customerCode,
                customerName,
                itemCode,
                quantity,
                unitPrice,
                null, // discount_percent
                lineTotal
              );
            }
          });

          insertMany(validRows);
          resolve(validRows.length);
        })
        .on('error', reject);
    });
  }

  private importExcelFile(
    filePath: string,
    tableName: string,
    columnMapping: { [key: string]: string }
  ): number {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      console.log(`  No data found in ${path.basename(filePath)}`);
      return 0;
    }

    // Filter out empty rows
    const validRows = data.filter(row => {
      return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
    });

    if (validRows.length === 0) {
      console.log(`  No valid data found in ${path.basename(filePath)}`);
      return 0;
    }

    const columns = Object.keys(columnMapping);
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.join(', ');
    
    const insertStmt = this.db.prepare(
      `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`
    );

    const insertMany = this.db.transaction((rows: any[]) => {
      for (const row of rows) {
        const values = columns.map(col => {
          const value = row[columnMapping[col]];
          if (value === null || value === undefined || String(value).trim() === '') return null;
          return value;
        });
        insertStmt.run(...values);
      }
    });

    insertMany(validRows);
    return validRows.length;
  }

  async importAllData() {
    console.log('\n=== Starting Data Import ===\n');

    this.ensureSchema();

    // Check if data already exists
    if (!this.resetMode && this.checkExistingData()) {
      console.log('\n⚠️  WARNING: Database already contains data!');
      console.log('   This will append new records to existing data.');
      console.log('   Use "pnpm run import:reset" to clear and reimport.\n');
    }

    console.log('\n--- Importing CSV Files ---\n');

    // Import catalogue prices
    console.log('Importing catalogue prices...');
    const catalogueCount = await this.importCsvFile(
      path.join(DATA_DIR, 'voltura_group_catalogue_price.csv'),
      'catalogue_prices',
      {
        item_code: 'ITEM CODE',
        ie_trade: 'IE Trade',
        ie_high: 'IE High',
        ie_mid: 'IE Mid',
        ie_low: 'IE Low',
        ie_base: 'IE Base',
        ie_edm: 'IE EDM',
        ie_anew: 'IE ANEW'
      }
    );
    console.log(`✓ Imported ${catalogueCount} catalogue price records\n`);

    // Import landed costs
    console.log('Importing landed costs...');
    const landedCount = await this.importCsvFile(
      path.join(DATA_DIR, 'voltura_group_landed_cost_july.csv'),
      'landed_costs',
      {
        item_code: 'ITEM CODE',
        landed_cost_euro: 'Landed cost Euro',
        plus_5_percent: 'Plus 5%'
      }
    );
    console.log(`✓ Imported ${landedCount} landed cost records\n`);

    // Import sales data (this is the large file)
    console.log('Importing sales data (this may take a while)...');
    const salesCount = await this.importSalesData(
      path.join(DATA_DIR, 'voltura_group_sales.csv')
    );
    console.log(`✓ Imported ${salesCount} sales records\n`);

    console.log('\n--- Importing Excel Files ---\n');

    // Import customer product keys
    console.log('Importing customer product keys...');
    const customerKeyCount = this.importExcelFile(
      path.join(DATA_DIR, 'Voltura Group Customer_Product Key.xlsx'),
      'customer_product_keys',
      {
        customer_code: 'Customer Code',
        customer_name: 'Customer Name',
        item_code: 'Item Code',
        product_description: 'Product Description'
      }
    );
    console.log(`✓ Imported ${customerKeyCount} customer product key records\n`);

    // Import pallet sizes
    console.log('Importing pallet sizes...');
    const palletCount = this.importExcelFile(
      path.join(DATA_DIR, 'Voltura_group_pallet_size.xlsx'),
      'pallet_sizes',
      {
        item_code: 'Item Code',
        pallet_quantity: 'Pallet Qty',
        description: 'Description'
      }
    );
    console.log(`✓ Imported ${palletCount} pallet size records\n`);

    // Print summary
    console.log('\n=== Import Summary ===\n');
    console.log(`Total catalogue prices: ${catalogueCount}`);
    console.log(`Total landed costs: ${landedCount}`);
    console.log(`Total sales records: ${salesCount}`);
    console.log(`Total customer product keys: ${customerKeyCount}`);
    console.log(`Total pallet sizes: ${palletCount}`);
    console.log(`\nDatabase location: ${DB_PATH}`);
    console.log('\n=== Import Complete ===\n');
  }

  close() {
    this.db.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const resetMode = args.includes('--reset');

if (args.includes('--help')) {
  console.log(`
Usage: pnpm run dev [options]

Options:
  --reset    Delete existing database and reimport all data
  --help     Show this help message

Examples:
  pnpm run dev           # Import data (preserves existing data)
  pnpm run dev --reset   # Delete and reimport everything
  `);
  process.exit(0);
}

// Run the import
const importer = new DataImporter(resetMode);
importer
  .importAllData()
  .then(() => {
    importer.close();
    console.log('Database connection closed.');
  })
  .catch((error) => {
    console.error('Error during import:', error);
    importer.close();
    process.exit(1);
  });

