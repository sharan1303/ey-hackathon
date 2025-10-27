import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const ORIGINAL_DB = path.join(__dirname, 'voltura_data.db');
const CLEANED_DB = path.join(__dirname, 'voltura_data_cleaned.db');
const REPORT_FILE = path.join(__dirname, 'data-cleaning-report.md');

interface CleaningStats {
  duplicatesCatalogueRemoved: number;
  duplicatesLandedRemoved: number;
  emptyPalletsRemoved: number;
  customerNamesStandardized: number;
  customerNameMappings: Array<{
    customerCode: string;
    originalNames: string[];
    standardizedName: string;
    occurrences: number;
  }>;
}

class DataCleaner {
  private db!: Database.Database;
  private stats: CleaningStats;

  constructor() {
    this.stats = {
      duplicatesCatalogueRemoved: 0,
      duplicatesLandedRemoved: 0,
      emptyPalletsRemoved: 0,
      customerNamesStandardized: 0,
      customerNameMappings: []
    };
  }

  /**
   * Copy the original database to create a cleaned version
   */
  private copyDatabase() {
    console.log('\n=== Step 1: Creating Database Copy ===\n');
    
    if (!fs.existsSync(ORIGINAL_DB)) {
      throw new Error(`Original database not found at: ${ORIGINAL_DB}`);
    }

    // Remove existing cleaned database if it exists
    if (fs.existsSync(CLEANED_DB)) {
      fs.unlinkSync(CLEANED_DB);
      console.log('✓ Removed existing cleaned database');
    }

    // Copy the database file
    fs.copyFileSync(ORIGINAL_DB, CLEANED_DB);
    console.log(`✓ Copied database: ${ORIGINAL_DB}`);
    console.log(`           → ${CLEANED_DB}`);

    // Connect to the cleaned database
    this.db = new Database(CLEANED_DB);
    console.log('✓ Connected to cleaned database');
  }

  /**
   * Remove duplicate item codes from catalogue_prices
   */
  private removeDuplicatesCatalogue() {
    console.log('\n=== Step 2: Removing Duplicate Item Codes (Catalogue) ===\n');

    // Find duplicates
    const duplicates = this.db.prepare(`
      SELECT item_code, COUNT(*) as count
      FROM catalogue_prices
      GROUP BY item_code
      HAVING COUNT(*) > 1
    `).all() as Array<{ item_code: string; count: number }>;

    console.log(`Found ${duplicates.length} item codes with duplicates`);

    if (duplicates.length === 0) {
      console.log('✓ No duplicates to remove');
      return;
    }

    // For each duplicate, keep only the first row (lowest id)
    const removeStmt = this.db.prepare(`
      DELETE FROM catalogue_prices
      WHERE item_code = ?
      AND id NOT IN (
        SELECT MIN(id)
        FROM catalogue_prices
        WHERE item_code = ?
      )
    `);

    const transaction = this.db.transaction(() => {
      for (const dup of duplicates) {
        const result = removeStmt.run(dup.item_code, dup.item_code);
        this.stats.duplicatesCatalogueRemoved += result.changes;
        console.log(`  ✓ Removed ${result.changes} duplicate(s) for: ${dup.item_code}`);
      }
    });

    transaction();
    console.log(`\n✓ Total duplicates removed: ${this.stats.duplicatesCatalogueRemoved}`);
  }

  /**
   * Remove duplicate item codes from landed_costs
   */
  private removeDuplicatesLanded() {
    console.log('\n=== Step 3: Removing Duplicate Item Codes (Landed Costs) ===\n');

    // Find duplicates
    const duplicates = this.db.prepare(`
      SELECT item_code, COUNT(*) as count
      FROM landed_costs
      GROUP BY item_code
      HAVING COUNT(*) > 1
    `).all() as Array<{ item_code: string; count: number }>;

    console.log(`Found ${duplicates.length} item codes with duplicates`);

    if (duplicates.length === 0) {
      console.log('✓ No duplicates to remove');
      return;
    }

    // For each duplicate, keep only the first row (lowest id)
    const removeStmt = this.db.prepare(`
      DELETE FROM landed_costs
      WHERE item_code = ?
      AND id NOT IN (
        SELECT MIN(id)
        FROM landed_costs
        WHERE item_code = ?
      )
    `);

    const transaction = this.db.transaction(() => {
      for (const dup of duplicates) {
        const result = removeStmt.run(dup.item_code, dup.item_code);
        this.stats.duplicatesLandedRemoved += result.changes;
        console.log(`  ✓ Removed ${result.changes} duplicate(s) for: ${dup.item_code}`);
      }
    });

    transaction();
    console.log(`\n✓ Total duplicates removed: ${this.stats.duplicatesLandedRemoved}`);
  }

  /**
   * Remove records with empty/NULL item codes from pallet_sizes
   */
  private removeEmptyPallets() {
    console.log('\n=== Step 4: Removing Empty Item Codes (Pallet Sizes) ===\n');

    const result = this.db.prepare(`
      DELETE FROM pallet_sizes
      WHERE item_code IS NULL OR item_code = ''
    `).run();

    this.stats.emptyPalletsRemoved = result.changes;
    console.log(`✓ Removed ${this.stats.emptyPalletsRemoved} records with empty item codes`);
  }

  /**
   * Add customer_name_standardized column to sales table
   */
  private addStandardizedColumn() {
    console.log('\n=== Step 5: Adding customer_name_standardized Column ===\n');

    try {
      this.db.prepare(`
        ALTER TABLE sales
        ADD COLUMN customer_name_standardized TEXT
      `).run();
      console.log('✓ Added customer_name_standardized column to sales table');
    } catch (error: any) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠ Column already exists, skipping...');
      } else {
        throw error;
      }
    }
  }

  /**
   * Standardize customer names by finding the most common name per customer_code
   */
  private standardizeCustomerNames() {
    console.log('\n=== Step 6: Standardizing Customer Names ===\n');

    // Find all customer codes with name variations
    const customerCodes = this.db.prepare(`
      SELECT DISTINCT customer_code
      FROM sales
      WHERE customer_code IS NOT NULL
      ORDER BY customer_code
    `).all() as Array<{ customer_code: string }>;

    console.log(`Processing ${customerCodes.length} unique customer codes...`);

    const updateStmt = this.db.prepare(`
      UPDATE sales
      SET customer_name_standardized = ?
      WHERE customer_code = ?
    `);

    let processedCount = 0;
    let variationsCount = 0;

    const transaction = this.db.transaction(() => {
      for (const { customer_code } of customerCodes) {
        // Get all name variations with their counts
        const nameVariations = this.db.prepare(`
          SELECT customer_name, COUNT(*) as count
          FROM sales
          WHERE customer_code = ?
          GROUP BY customer_name
          ORDER BY count DESC
        `).all(customer_code) as Array<{ customer_name: string; count: number }>;

        if (nameVariations.length > 0) {
          // Use the most common name
          const standardName = nameVariations[0].customer_name;
          const totalOccurrences = nameVariations.reduce((sum, v) => sum + v.count, 0);

          // Update all records for this customer code
          updateStmt.run(standardName, customer_code);
          processedCount++;

          // Track variations
          if (nameVariations.length > 1) {
            variationsCount++;
            this.stats.customerNameMappings.push({
              customerCode: customer_code,
              originalNames: nameVariations.map(v => v.customer_name),
              standardizedName: standardName,
              occurrences: totalOccurrences
            });
          }
        }
      }
    });

    transaction();

    this.stats.customerNamesStandardized = processedCount;
    console.log(`✓ Standardized names for ${processedCount} customer codes`);
    console.log(`✓ Found ${variationsCount} customer codes with name variations`);

    // Show some examples
    if (this.stats.customerNameMappings.length > 0) {
      console.log('\nExamples of standardized names:');
      this.stats.customerNameMappings.slice(0, 5).forEach(mapping => {
        console.log(`  ${mapping.customerCode}:`);
        console.log(`    Original variations: ${mapping.originalNames.length}`);
        console.log(`    Standardized to: "${mapping.standardizedName}"`);
      });
    }
  }

  /**
   * Generate a summary report
   */
  private generateReport() {
    console.log('\n=== Step 7: Generating Summary Report ===\n');

    // Get final table counts
    const catalogueCount = this.db.prepare('SELECT COUNT(*) as count FROM catalogue_prices').get() as { count: number };
    const landedCount = this.db.prepare('SELECT COUNT(*) as count FROM landed_costs').get() as { count: number };
    const palletCount = this.db.prepare('SELECT COUNT(*) as count FROM pallet_sizes').get() as { count: number };
    const salesCount = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };

    // Generate markdown report
    const report = `# Data Cleaning Report

## Summary

This report documents the data cleaning operations performed on the Voltura Group dataset.

**Date:** ${new Date().toISOString().split('T')[0]}

**Original Database:** \`voltura_data.db\`

**Cleaned Database:** \`data/voltura_data_cleaned.db\`

## Cleaning Operations Performed

### 1. Removed Duplicate Item Codes

**Catalogue Prices:**
- Duplicates removed: ${this.stats.duplicatesCatalogueRemoved}
- Final record count: ${catalogueCount.count}

**Landed Costs:**
- Duplicates removed: ${this.stats.duplicatesLandedRemoved}
- Final record count: ${landedCount.count}

**Action:** Kept only the first occurrence (lowest ID) for each item_code.

### 2. Removed Empty Item Codes

**Pallet Sizes:**
- Records removed: ${this.stats.emptyPalletsRemoved}
- Final record count: ${palletCount.count}

**Action:** Deleted all records where item_code was NULL or empty string.

### 3. Standardized Customer Names

**Sales Table:**
- Customer codes processed: ${this.stats.customerNamesStandardized}
- Customer codes with name variations: ${this.stats.customerNameMappings.length}
- Total sales records: ${salesCount.count}

**Action:** Added \`customer_name_standardized\` column populated with the most frequently occurring name for each customer_code.

## Customer Name Standardization Details

${this.stats.customerNameMappings.length > 0 ? this.generateCustomerMappingTable() : 'No customer name variations found.'}

## Data Preserved

The following data was intentionally **preserved** as valid business data:

1. **Negative quantities** (${this.getCount('SELECT COUNT(*) as count FROM sales WHERE quantity < 0')}) - Represents returns/credit notes
2. **Zero or negative prices** (${this.getCount('SELECT COUNT(*) as count FROM sales WHERE unit_price <= 0')}) - May represent promotional items or free goods
3. **Orphaned sales records** - Sales records where item_code doesn't exist in catalogue_prices (valid historical transactions)
4. **Orphaned customer codes** - Sales records where customer_code doesn't exist in customer_product_keys (valid transactions)

## Final Table Statistics

| Table | Record Count |
|-------|--------------|
| catalogue_prices | ${catalogueCount.count} |
| landed_costs | ${landedCount.count} |
| sales | ${salesCount.count} |
| customer_product_keys | ${this.getCount('SELECT COUNT(*) as count FROM customer_product_keys')} |
| pallet_sizes | ${palletCount.count} |

## Remaining Data Quality Notes

### Missing Values
- Sales records with NULL unit_price: ${this.getCount('SELECT COUNT(*) as count FROM sales WHERE unit_price IS NULL')}
- Catalogue items with NULL ie_trade: ${this.getCount('SELECT COUNT(*) as count FROM catalogue_prices WHERE ie_trade IS NULL')}
- Landed costs with NULL landed_cost_euro: ${this.getCount('SELECT COUNT(*) as count FROM landed_costs WHERE landed_cost_euro IS NULL')}

### Referential Integrity
- Item codes in sales not in catalogue: ${this.getCount(`
  SELECT COUNT(DISTINCT s.item_code) as count
  FROM sales s
  LEFT JOIN catalogue_prices c ON s.item_code = c.item_code
  WHERE c.item_code IS NULL
`)}
- Customer codes in sales not in customer_product_keys: ${this.getCount(`
  SELECT COUNT(DISTINCT s.customer_code) as count
  FROM sales s
  LEFT JOIN customer_product_keys cpk ON s.customer_code = cpk.customer_code
  WHERE cpk.customer_code IS NULL AND s.customer_code IS NOT NULL
`)}

## Usage

To use the cleaned database:

\`\`\`typescript
import Database from 'better-sqlite3';
const db = new Database('data/voltura_data_cleaned.db');

// Query with standardized customer names
const results = db.prepare(\`
  SELECT customer_code, customer_name_standardized, SUM(line_total) as revenue
  FROM sales
  GROUP BY customer_code, customer_name_standardized
  ORDER BY revenue DESC
\`).all();
\`\`\`

## Notes

- Original database remains unchanged at \`voltura_data.db\`
- All cleaning operations were performed in transactions
- Customer name standardization preserves original \`customer_name\` column for audit trail
`;

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`✓ Report generated: ${REPORT_FILE}`);
  }

  /**
   * Generate customer name mapping table for report
   */
  private generateCustomerMappingTable(): string {
    const topMappings = this.stats.customerNameMappings.slice(0, 20);
    
    let table = '\n| Customer Code | Variations | Standardized Name | Total Records |\n';
    table += '|---------------|------------|-------------------|---------------|\n';
    
    for (const mapping of topMappings) {
      const variations = mapping.originalNames.length;
      const name = mapping.standardizedName.length > 40 
        ? mapping.standardizedName.substring(0, 40) + '...' 
        : mapping.standardizedName;
      table += `| ${mapping.customerCode} | ${variations} | ${name} | ${mapping.occurrences} |\n`;
    }

    if (this.stats.customerNameMappings.length > 20) {
      table += `\n*Showing top 20 of ${this.stats.customerNameMappings.length} customer codes with variations.*\n`;
    }

    return table;
  }

  /**
   * Helper to get count from query
   */
  private getCount(query: string): number {
    const result = this.db.prepare(query).get() as { count: number };
    return result.count;
  }

  /**
   * Run all cleaning operations
   */
  async clean() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   Voltura Data Cleaning Process Started   ║');
    console.log('╚════════════════════════════════════════════╝');

    try {
      this.copyDatabase();
      this.removeDuplicatesCatalogue();
      this.removeDuplicatesLanded();
      this.removeEmptyPallets();
      this.addStandardizedColumn();
      this.standardizeCustomerNames();
      this.generateReport();

      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║   Data Cleaning Completed Successfully!   ║');
      console.log('╚════════════════════════════════════════════╝\n');

      console.log('📊 Cleaning Summary:');
      console.log(`   • Catalogue duplicates removed: ${this.stats.duplicatesCatalogueRemoved}`);
      console.log(`   • Landed cost duplicates removed: ${this.stats.duplicatesLandedRemoved}`);
      console.log(`   • Empty pallet records removed: ${this.stats.emptyPalletsRemoved}`);
      console.log(`   • Customer names standardized: ${this.stats.customerNamesStandardized}`);
      console.log(`   • Customer codes with variations: ${this.stats.customerNameMappings.length}\n`);

      console.log(`📁 Cleaned database: ${CLEANED_DB}`);
      console.log(`📄 Report: ${REPORT_FILE}\n`);

    } catch (error) {
      console.error('\n❌ Error during data cleaning:', error);
      throw error;
    } finally {
      if (this.db) {
        this.db.close();
        console.log('✓ Database connection closed');
      }
    }
  }
}

// Run the cleaner
const cleaner = new DataCleaner();
cleaner.clean().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

