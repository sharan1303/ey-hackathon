import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const ORIGINAL_DB = path.join(__dirname, '..','voltura_data.db');
const CLEANED_DB = path.join(__dirname, '..', 'voltura_data_cleaned.db');
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
  rebatesMarked: number;
  returnsMarked: number;
  samplesMarked: number;
  negativeQtyOnInvFixed: number;
  priceRebatesMarked: number;
  fractionalQtyMarked: number;
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
      customerNameMappings: [],
      rebatesMarked: 0,
      returnsMarked: 0,
      samplesMarked: 0,
      negativeQtyOnInvFixed: 0,
      priceRebatesMarked: 0,
      fractionalQtyMarked: 0
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
   * Add new columns to sales table for business rules
   */
  private addBusinessRuleColumns() {
    console.log('\n=== Step 2: Adding Business Rule Columns ===\n');

    const columns = [
      { name: 'document_type', type: 'TEXT' },           // 'INV' or 'CRN'
      { name: 'is_rebate', type: 'INTEGER DEFAULT 0' },  // Boolean flag
      { name: 'is_return', type: 'INTEGER DEFAULT 0' },  // Boolean flag
      { name: 'is_sample', type: 'INTEGER DEFAULT 0' },  // Boolean flag
      { name: 'unit_type', type: 'TEXT' },               // 'meter', 'unit', etc.
      { name: 'quantity_corrected', type: 'REAL' },      // Corrected quantity
      { name: 'unit_price_corrected', type: 'REAL' },    // Corrected price
      { name: 'data_quality_issue', type: 'TEXT' },      // Description of DQ issue
      { name: 'customer_name_standardized', type: 'TEXT' }
    ];

    for (const col of columns) {
      try {
        this.db.prepare(`ALTER TABLE sales ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`✓ Added column: ${col.name}`);
      } catch (error: any) {
        if (error.message.includes('duplicate column name')) {
          console.log(`⚠ Column ${col.name} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Classify document type based on line_total sign
   * Negative line_total = Credit Note (CRN), otherwise Invoice (INV)
   */
  private classifyDocumentTypes() {
    console.log('\n=== Step 3: Classifying Document Types ===\n');

    const result = this.db.prepare(`
      UPDATE sales
      SET document_type = CASE
        WHEN line_total < 0 THEN 'CRN'
        ELSE 'INV'
      END
    `).run();

    console.log(`✓ Classified ${result.changes} records as INV or CRN`);
    
    const invCount = this.db.prepare("SELECT COUNT(*) as count FROM sales WHERE document_type = 'INV'").get() as { count: number };
    const crnCount = this.db.prepare("SELECT COUNT(*) as count FROM sales WHERE document_type = 'CRN'").get() as { count: number };
    
    console.log(`  Invoices (INV): ${invCount.count}`);
    console.log(`  Credit Notes (CRN): ${crnCount.count}`);
  }

  /**
   * Apply business rules based on the provided table
   */
  private applyBusinessRules() {
    console.log('\n=== Step 4: Applying Business Rules ===\n');

    // Rule 1: Price < 0 on credit note → Keep as negative, mark as rebate
    console.log('Applying Rule 1: Price < 0 on credit note (rebate)...');
    let result = this.db.prepare(`
      UPDATE sales
      SET is_rebate = 1,
          unit_price_corrected = unit_price
      WHERE document_type = 'CRN'
        AND unit_price < 0
    `).run();
    this.stats.priceRebatesMarked = result.changes;
    console.log(`  ✓ Marked ${result.changes} price rebates on credit notes`);

    // Rule 2: Item Quantity < 0 on invoice (INV) → Convert to positive (DQ error)
    console.log('Applying Rule 2: Negative quantity on invoice (DQ error)...');
    result = this.db.prepare(`
      UPDATE sales
      SET quantity_corrected = ABS(quantity),
          data_quality_issue = 'Negative quantity on invoice - converted to positive'
      WHERE document_type = 'INV'
        AND quantity < 0
    `).run();
    this.stats.negativeQtyOnInvFixed = result.changes;
    console.log(`  ✓ Fixed ${result.changes} negative quantities on invoices`);

    // Rule 3: Item Quantity < 0 on credit note (CRN) → Keep as negative, mark as return
    console.log('Applying Rule 3: Negative quantity on credit note (return)...');
    result = this.db.prepare(`
      UPDATE sales
      SET is_return = 1,
          quantity_corrected = quantity
      WHERE document_type = 'CRN'
        AND quantity < 0
    `).run();
    this.stats.returnsMarked = result.changes;
    console.log(`  ✓ Marked ${result.changes} returns`);

    // Rule 4: Item Quantity > 0 on credit note → Keep positive, mark as rebate
    console.log('Applying Rule 4: Positive quantity on credit note (rebate)...');
    result = this.db.prepare(`
      UPDATE sales
      SET is_rebate = 1,
          quantity_corrected = quantity
      WHERE document_type = 'CRN'
        AND quantity > 0
    `).run();
    this.stats.rebatesMarked = result.changes;
    console.log(`  ✓ Marked ${result.changes} quantity rebates`);

    // Rule 5: Item Quantity has decimal → Mark as meter/unit-length
    console.log('Applying Rule 5: Fractional quantities (meter sales)...');
    result = this.db.prepare(`
      UPDATE sales
      SET unit_type = 'meter',
          quantity_corrected = quantity
      WHERE quantity != CAST(quantity AS INTEGER)
        AND quantity_corrected IS NULL
    `).run();
    this.stats.fractionalQtyMarked = result.changes;
    console.log(`  ✓ Marked ${result.changes} fractional quantity items`);

    // Rule 6: Price between 0 and 0.1 on INV → Mark as sample
    console.log('Applying Rule 6: Near-zero prices on invoice (samples)...');
    result = this.db.prepare(`
      UPDATE sales
      SET is_sample = 1,
          unit_price_corrected = unit_price
      WHERE document_type = 'INV'
        AND unit_price > 0
        AND unit_price < 0.1
    `).run();
    console.log(`  ✓ Marked ${result.changes} near-zero price items as samples`);

    // Rule 7: Price = 0, Quantity > 0 → Keep but flag as sample
    console.log('Applying Rule 7: Zero price with positive quantity (free/promo)...');
    result = this.db.prepare(`
      UPDATE sales
      SET is_sample = 1,
          unit_price_corrected = unit_price,
          quantity_corrected = COALESCE(quantity_corrected, quantity)
      WHERE unit_price = 0
        AND quantity > 0
        AND is_sample = 0
    `).run();
    const samplesFromZeroPrice = result.changes;
    this.stats.samplesMarked += samplesFromZeroPrice;
    console.log(`  ✓ Marked ${samplesFromZeroPrice} zero-price items as samples`);

    // Rule 8: Price > 0, Quantity < 0 on INV → Flip quantity to positive (DQ issue)
    console.log('Applying Rule 8: Positive price with negative qty on invoice (DQ issue)...');
    result = this.db.prepare(`
      UPDATE sales
      SET quantity_corrected = ABS(quantity),
          data_quality_issue = 'Negative quantity with positive price on invoice - converted to positive'
      WHERE document_type = 'INV'
        AND unit_price > 0
        AND quantity < 0
        AND quantity_corrected IS NULL
    `).run();
    console.log(`  ✓ Fixed ${result.changes} additional DQ issues`);

    // Fill in any remaining NULL corrected values with original values
    console.log('Applying defaults for uncorrected values...');
    this.db.prepare(`
      UPDATE sales
      SET quantity_corrected = quantity
      WHERE quantity_corrected IS NULL
    `).run();
    
    this.db.prepare(`
      UPDATE sales
      SET unit_price_corrected = unit_price
      WHERE unit_price_corrected IS NULL
    `).run();
    console.log(`  ✓ Filled remaining corrected values with originals`);
  }

  /**
   * Remove duplicate item codes from catalogue_prices
   */
  private removeDuplicatesCatalogue() {
    console.log('\n=== Step 5: Removing Duplicate Item Codes (Catalogue) ===\n');

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
      }
    });

    transaction();
    console.log(`✓ Total duplicates removed: ${this.stats.duplicatesCatalogueRemoved}`);
  }

  /**
   * Remove duplicate item codes from landed_costs
   */
  private removeDuplicatesLanded() {
    console.log('\n=== Step 6: Removing Duplicate Item Codes (Landed Costs) ===\n');

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
      }
    });

    transaction();
    console.log(`✓ Total duplicates removed: ${this.stats.duplicatesLandedRemoved}`);
  }

  /**
   * Remove records with empty/NULL item codes from pallet_sizes
   */
  private removeEmptyPallets() {
    console.log('\n=== Step 7: Removing Empty Item Codes (Pallet Sizes) ===\n');

    const result = this.db.prepare(`
      DELETE FROM pallet_sizes
      WHERE item_code IS NULL OR item_code = ''
    `).run();

    this.stats.emptyPalletsRemoved = result.changes;
    console.log(`✓ Removed ${this.stats.emptyPalletsRemoved} records with empty item codes`);
  }

  /**
   * Standardize customer names by finding the most common name per customer_code
   */
  private standardizeCustomerNames() {
    console.log('\n=== Step 8: Standardizing Customer Names ===\n');

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
        const nameVariations = this.db.prepare(`
          SELECT customer_name, COUNT(*) as count
          FROM sales
          WHERE customer_code = ?
          GROUP BY customer_name
          ORDER BY count DESC
        `).all(customer_code) as Array<{ customer_name: string; count: number }>;

        if (nameVariations.length > 0) {
          const standardName = nameVariations[0].customer_name;
          const totalOccurrences = nameVariations.reduce((sum, v) => sum + v.count, 0);

          updateStmt.run(standardName, customer_code);
          processedCount++;

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
  }

  /**
   * Drop original columns and rename corrected columns
   */
  private finalizeCleanedColumns() {
    console.log('\n=== Step 9: Finalizing Cleaned Columns ===\n');

    // Drop views that depend on the sales table
    console.log('Dropping views that depend on sales table...');
    const views = ['vw_product_pricing', 'vw_sales_by_customer', 'vw_sales_by_product', 'vw_monthly_sales'];
    for (const view of views) {
      try {
        this.db.prepare(`DROP VIEW IF EXISTS ${view}`).run();
        console.log(`✓ Dropped view: ${view}`);
      } catch (error) {
        console.log(`⚠ Could not drop view ${view}: ${error}`);
      }
    }

    // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
    console.log('Creating new sales table with only cleaned columns...');

    // Create new table with only the columns we want
    this.db.prepare(`
      CREATE TABLE sales_cleaned (
        id INTEGER PRIMARY KEY,
        invoice_number TEXT,
        invoice_date TEXT,
        customer_code TEXT,
        customer_name TEXT,
        item_code TEXT,
        item_description TEXT,
        quantity REAL,
        unit_price REAL,
        line_total REAL,
        document_type TEXT,
        is_rebate INTEGER DEFAULT 0,
        is_return INTEGER DEFAULT 0,
        is_sample INTEGER DEFAULT 0,
        unit_type TEXT,
        data_quality_issue TEXT
      )
    `).run();

    console.log('✓ Created new sales table structure');

    // Copy data with corrected columns renamed
    console.log('Copying data with corrected values...');
    this.db.prepare(`
      INSERT INTO sales_cleaned (
        id, invoice_number, invoice_date, customer_code, customer_name,
        item_code, item_description, quantity, unit_price, line_total,
        document_type, is_rebate, is_return, is_sample, unit_type, data_quality_issue
      )
      SELECT 
        id, invoice_number, invoice_date, customer_code, customer_name_standardized,
        item_code, item_description, quantity_corrected, unit_price_corrected, line_total,
        document_type, is_rebate, is_return, is_sample, unit_type, data_quality_issue
      FROM sales
    `).run();

    console.log('✓ Copied data with corrected values');

    // Drop old table and rename new one
    this.db.prepare('DROP TABLE sales').run();
    this.db.prepare('ALTER TABLE sales_cleaned RENAME TO sales').run();

    console.log('✓ Replaced sales table with cleaned version');
    console.log('✓ Original columns removed, corrected values are now the defaults');
    
    // Recreate views with updated column names
    console.log('Recreating views with updated schema...');
    this.recreateViews();
    
    // Compact the database to reclaim space
    console.log('Compacting database...');
    this.db.prepare('VACUUM').run();
    console.log('✓ Database compacted');
  }

  /**
   * Recreate views that were dropped
   */
  private recreateViews() {
    // vw_product_pricing
    this.db.prepare(`
      CREATE VIEW vw_product_pricing AS
      SELECT 
        cp.item_code,
        cp.ie_trade as catalogue_price,
        lc.landed_cost_euro as landed_cost,
        cp.ie_trade - lc.landed_cost_euro as margin,
        CASE 
          WHEN lc.landed_cost_euro > 0 
          THEN ((cp.ie_trade - lc.landed_cost_euro) / lc.landed_cost_euro) * 100 
          ELSE NULL 
        END as margin_percentage
      FROM catalogue_prices cp
      LEFT JOIN landed_costs lc ON cp.item_code = lc.item_code
    `).run();
    console.log('✓ Recreated view: vw_product_pricing');

    // vw_sales_by_customer
    this.db.prepare(`
      CREATE VIEW vw_sales_by_customer AS
      SELECT 
        customer_code,
        customer_name,
        COUNT(*) as transaction_count,
        SUM(quantity) as total_quantity,
        SUM(line_total) as total_revenue
      FROM sales
      WHERE document_type = 'INV'
        AND is_return = 0
        AND is_rebate = 0
        AND is_sample = 0
      GROUP BY customer_code, customer_name
    `).run();
    console.log('✓ Recreated view: vw_sales_by_customer');

    // vw_sales_by_product
    this.db.prepare(`
      CREATE VIEW vw_sales_by_product AS
      SELECT 
        item_code,
        COUNT(*) as transaction_count,
        SUM(quantity) as total_quantity,
        SUM(line_total) as total_revenue,
        AVG(unit_price) as avg_price
      FROM sales
      WHERE document_type = 'INV'
        AND is_return = 0
        AND is_rebate = 0
        AND is_sample = 0
      GROUP BY item_code
    `).run();
    console.log('✓ Recreated view: vw_sales_by_product');

    // vw_monthly_sales
    this.db.prepare(`
      CREATE VIEW vw_monthly_sales AS
      SELECT 
        strftime('%Y-%m', invoice_date) as month,
        COUNT(*) as transaction_count,
        SUM(quantity) as total_quantity,
        SUM(line_total) as total_revenue
      FROM sales
      WHERE document_type = 'INV'
        AND is_return = 0
        AND is_rebate = 0
        AND is_sample = 0
      GROUP BY strftime('%Y-%m', invoice_date)
    `).run();
    console.log('✓ Recreated view: vw_monthly_sales');
  }


  /**
   * Generate a summary report
   */
  private generateReport() {
    console.log('\n=== Step 10: Generating Summary Report ===\n');

    const catalogueCount = this.db.prepare('SELECT COUNT(*) as count FROM catalogue_prices').get() as { count: number };
    const landedCount = this.db.prepare('SELECT COUNT(*) as count FROM landed_costs').get() as { count: number };
    const palletCount = this.db.prepare('SELECT COUNT(*) as count FROM pallet_sizes').get() as { count: number };
    const salesCount = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
    const invCount = this.db.prepare("SELECT COUNT(*) as count FROM sales WHERE document_type = 'INV'").get() as { count: number };
    const crnCount = this.db.prepare("SELECT COUNT(*) as count FROM sales WHERE document_type = 'CRN'").get() as { count: number };

    const report = `# Data Cleaning Report

## Summary

This report documents the data cleaning operations performed on the Voltura Group dataset with business rule enforcement.

**Date:** ${new Date().toISOString().split('T')[0]}

**Original Database:** \`voltura_data.db\`

**Cleaned Database:** \`data/voltura_data_cleaned.db\`

## Document Classification

| Document Type | Count | Description |
|---------------|-------|-------------|
| Invoice (INV) | ${invCount.count} | Regular sales transactions |
| Credit Note (CRN) | ${crnCount.count} | Returns, rebates, and adjustments |

## Business Rules Applied

### 1. Price Handling

**Price < 0 on Credit Note (Rebate):**
- Records flagged: ${this.stats.priceRebatesMarked}
- Action: Kept as negative, marked \`is_rebate = 1\`
- Reason: Indicates margin adjustment, not a sale error

**Price between 0 and 0.1 on Invoice (Sample):**
- Records flagged: Included in sample count below
- Action: Marked \`is_sample = 1\`
- Reason: Represents product sample, not sale

**Price = 0 with Quantity > 0 (Free/Promo):**
- Records flagged: ${this.stats.samplesMarked}
- Action: Kept as-is, marked \`is_sample = 1\`
- Reason: May be part of promotional strategy

### 2. Quantity Handling

**Negative Quantity on Invoice (DQ Error):**
- Records corrected: ${this.stats.negativeQtyOnInvFixed}
- Action: Converted to positive value in \`quantity_corrected\`
- Reason: No invoice should have negative sold quantity

**Negative Quantity on Credit Note (Return):**
- Records flagged: ${this.stats.returnsMarked}
- Action: Kept as negative, marked \`is_return = 1\`
- Reason: Negative quantity means goods returned

**Positive Quantity on Credit Note (Rebate):**
- Records flagged: ${this.stats.rebatesMarked}
- Action: Kept as positive, marked \`is_rebate = 1\`
- Reason: Represents rebate, not physical return

**Fractional Quantity (Meter Sales):**
- Records flagged: ${this.stats.fractionalQtyMarked}
- Action: Marked \`unit_type = 'meter'\`
- Reason: Represents fractional sale (not an error)

### 3. Data Quality Corrections

The following columns were added to track corrections:
- \`quantity_corrected\` - Corrected quantity values
- \`unit_price_corrected\` - Corrected price values
- \`data_quality_issue\` - Description of any DQ issues found

### 4. Duplicate Removal

**Catalogue Prices:**
- Duplicates removed: ${this.stats.duplicatesCatalogueRemoved}
- Final record count: ${catalogueCount.count}

**Landed Costs:**
- Duplicates removed: ${this.stats.duplicatesLandedRemoved}
- Final record count: ${landedCount.count}

**Pallet Sizes:**
- Empty records removed: ${this.stats.emptyPalletsRemoved}
- Final record count: ${palletCount.count}

### 5. Customer Name Standardization

**Sales Table:**
- Customer codes processed: ${this.stats.customerNamesStandardized}
- Customer codes with name variations: ${this.stats.customerNameMappings.length}

${this.stats.customerNameMappings.length > 0 ? this.generateCustomerMappingTable() : ''}

## Final Table Statistics

| Table | Record Count |
|-------|--------------|
| catalogue_prices | ${catalogueCount.count} |
| landed_costs | ${landedCount.count} |
| sales | ${salesCount.count} |
| customer_product_keys | ${this.getCount('SELECT COUNT(*) as count FROM customer_product_keys')} |
| pallet_sizes | ${palletCount.count} |

## Sales Table Schema (Cleaned)

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | INTEGER | Primary key |
| \`customer_code\` | TEXT | Customer identifier |
| \`customer_name\` | TEXT | Standardized customer name |
| \`region\` | TEXT | Customer region (IESER, IEWR, etc.) |
| \`invoice_number\` | TEXT | Invoice or credit note number |
| \`document_type\` | TEXT | 'INV' for Invoice, 'CRN' for Credit Note |
| \`invoice_date\` | TEXT | Transaction date |
| \`item_code\` | TEXT | Product identifier |
| \`item_description\` | TEXT | Product description |
| \`quantity\` | REAL | Corrected quantity (after DQ fixes) |
| \`currency\` | TEXT | Transaction currency (GBP, EUR, etc.) |
| \`unit_price\` | REAL | Corrected unit price (after DQ fixes) |
| \`line_total\` | REAL | Total line value |
| \`is_rebate\` | INTEGER | 1 if record is a rebate/margin adjustment |
| \`is_return\` | INTEGER | 1 if record is a product return |
| \`is_sample\` | INTEGER | 1 if record is a sample/free item |
| \`unit_type\` | TEXT | 'meter' for fractional quantities, NULL otherwise |
| \`data_quality_issue\` | TEXT | Description of any DQ issue found |

**Note:** The cleaned database contains only corrected values. Original uncleaned data is preserved in \`voltura_data.db\`.

## Usage Examples

### Query invoices only (excluding returns/rebates)

\`\`\`sql
SELECT * FROM sales 
WHERE document_type = 'INV' 
  AND is_sample = 0;
\`\`\`

### Calculate net sales (excluding returns)

\`\`\`sql
SELECT 
  customer_code,
  customer_name,
  SUM(CASE WHEN is_return = 0 THEN line_total ELSE 0 END) as net_revenue
FROM sales
GROUP BY customer_code, customer_name;
\`\`\`

### Find products sold by meter

\`\`\`sql
SELECT item_code, quantity, unit_type
FROM sales
WHERE unit_type = 'meter';
\`\`\`

### Review data quality issues

\`\`\`sql
SELECT invoice_number, item_code, quantity, data_quality_issue
FROM sales
WHERE data_quality_issue IS NOT NULL;
\`\`\`

## TypeScript Usage

\`\`\`typescript
import Database from 'better-sqlite3';
const db = new Database('data/voltura_data_cleaned.db');

// Get actual sales (excluding returns, rebates, samples)
const actualSales = db.prepare(\`
  SELECT 
    customer_name,
    SUM(quantity * unit_price) as revenue
  FROM sales
  WHERE document_type = 'INV'
    AND is_return = 0
    AND is_rebate = 0
    AND is_sample = 0
  GROUP BY customer_name
  ORDER BY revenue DESC
\`).all();
\`\`\`

## Notes

- Original database remains unchanged at \`voltura_data.db\`
- All cleaning operations were performed in transactions
- The cleaned database contains only corrected values in standard columns
- \`quantity\` and \`unit_price\` columns contain the corrected values (not the original uncleaned data)
- \`customer_name\` contains the standardized customer name (not the original variations)
`;

    fs.writeFileSync(REPORT_FILE, report);
    console.log(`✓ Report generated: ${REPORT_FILE}`);
  }

  private generateCustomerMappingTable(): string {
    const topMappings = this.stats.customerNameMappings.slice(0, 10);
    
    let table = '\n**Top Customer Name Variations:**\n\n';
    table += '| Customer Code | Variations | Standardized Name | Total Records |\n';
    table += '|---------------|------------|-------------------|---------------|\n';
    
    for (const mapping of topMappings) {
      const variations = mapping.originalNames.length;
      const name = mapping.standardizedName.length > 40 
        ? mapping.standardizedName.substring(0, 40) + '...' 
        : mapping.standardizedName;
      table += `| ${mapping.customerCode} | ${variations} | ${name} | ${mapping.occurrences} |\n`;
    }

    if (this.stats.customerNameMappings.length > 10) {
      table += `\n*Showing top 10 of ${this.stats.customerNameMappings.length} customer codes with variations.*\n`;
    }

    return table;
  }

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
      this.addBusinessRuleColumns();
      this.classifyDocumentTypes();
      this.applyBusinessRules();
      this.removeDuplicatesCatalogue();
      this.removeDuplicatesLanded();
      this.removeEmptyPallets();
      this.standardizeCustomerNames();
      this.finalizeCleanedColumns();
      this.generateReport();

      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║   Data Cleaning Completed Successfully!   ║');
      console.log('╚════════════════════════════════════════════╝\n');

      console.log('📊 Cleaning Summary:');
      console.log(`   • Documents classified: INV + CRN`);
      console.log(`   • Rebates marked: ${this.stats.rebatesMarked + this.stats.priceRebatesMarked}`);
      console.log(`   • Returns marked: ${this.stats.returnsMarked}`);
      console.log(`   • Samples marked: ${this.stats.samplesMarked}`);
      console.log(`   • DQ issues fixed: ${this.stats.negativeQtyOnInvFixed}`);
      console.log(`   • Fractional qty marked: ${this.stats.fractionalQtyMarked}`);
      console.log(`   • Catalogue duplicates removed: ${this.stats.duplicatesCatalogueRemoved}`);
      console.log(`   • Landed cost duplicates removed: ${this.stats.duplicatesLandedRemoved}`);
      console.log(`   • Customer names standardized: ${this.stats.customerNamesStandardized}\n`);

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
