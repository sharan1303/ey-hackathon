# EY Hackathon

Import and analyze Voltura Group sales, pricing, and inventory data using SQLite.

## Quick Start

```bash
# Install dependencies
pnpm install

# Create database schema
pnpm run schema

# Import data
pnpm run dev

# Run example queries (optional)
pnpm run query
```

## Commands

### Schema Management

```bash
pnpm run schema        # Create or verify schema
pnpm run schema reset  # Reset schema (⚠️ deletes all data)
pnpm run schema info   # Show database details
```

### Data Import

```bash
pnpm run dev            # Import data (preserves existing)
pnpm run import:reset   # Delete database and reimport
```

### Data Cleaning

```bash
pnpm run clean  # Clean data (creates voltura_data_cleaned.db)
```

This command:

- Creates a copy of `voltura_data.db` as `voltura_data_cleaned.db`
- Removes duplicate item codes from catalogue_prices and landed_costs
- Removes empty item codes from pallet_sizes
- Adds `customer_name_standardized` column to sales table
- Generates a detailed cleaning report at `data-cleaning-report.md`

### Query Examples

```bash
pnpm run query  # Run example queries
```

## Database Structure

**Databases:**

- `voltura_data.db` - Original database with raw imported data (1:1 mapping of source files)
- `voltura_data_cleaned.db` - Cleaned database ready for analysis (created by `pnpm run clean`)

**Tables:**

- `catalogue_prices` - Product pricing tiers
- `landed_costs` - Product cost information
- `sales` - Sales transaction records (cleaned version includes `customer_name_standardized` column)
- `customer_product_keys` - Customer-product mappings
- `pallet_sizes` - Pallet quantity information

**Analytical Views:**

- `vw_product_pricing` - Complete product pricing with costs
- `vw_sales_by_customer` - Customer sales summary
- `vw_sales_by_product` - Product sales summary
- `vw_monthly_sales` - Monthly sales trends

See [SCHEMA.md](SCHEMA.md) for detailed schema documentation and example queries.

## Data Files

The import process reads from the `data/` folder:

- `voltura_group_catalogue_price.csv`
- `voltura_group_landed_cost_july.csv`
- `voltura_group_sales.csv`
- `Voltura Group Customer_Product Key.xlsx`
- `Voltura_group_pallet_size.xlsx`

## Using the Database

### Node.js/TypeScript

```typescript
import Database from 'better-sqlite3';

// Use the cleaned database for analysis
const db = new Database('voltura_data_cleaned.db');

// Simple query
const products = db.prepare('SELECT * FROM catalogue_prices LIMIT 10').all();

// Query with standardized customer names
const sales = db.prepare(`
  SELECT customer_code, customer_name_standardized, SUM(line_total) as revenue
  FROM sales
  GROUP BY customer_code, customer_name_standardized
  ORDER BY revenue DESC
`).all();

db.close();
```

### SQLite CLI

```bash
sqlite3 voltura_data.db

# View tables
.tables

# Run queries
SELECT * FROM sales LIMIT 10;
SELECT item_code, SUM(quantity) FROM sales GROUP BY item_code;

.quit
```

## Troubleshooting

**Import fails:**

- Verify all data files exist in `data/` folder
- Check file names match exactly (case-sensitive)
- Delete `voltura_data.db` and retry

**Missing dependencies:**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Project Structure

```text
ey-hackathon/
├── app/
│   ├── schema.sql              # Database schema definition
│   └── src/
│       ├── create-schema.ts    # Schema CLI tool
│       ├── import-data.ts      # Data import script
│       ├── query-example.ts    # Example queries
│       └── schema.ts           # Schema manager
├── data/                       # CSV and Excel source files
├── package.json
└── README.md
```
