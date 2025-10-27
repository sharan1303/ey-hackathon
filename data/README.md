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

### Query Examples

```bash
pnpm run query  # Run example queries
```

## Database Structure

The database includes:

**Tables:**

- `catalogue_prices` - Product pricing tiers
- `landed_costs` - Product cost information
- `sales` - Sales transaction records
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

const db = new Database('voltura_data.db');

// Simple query
const products = db.prepare('SELECT * FROM catalogue_prices LIMIT 10').all();

// Query with parameters
const sales = db.prepare('SELECT * FROM sales WHERE item_code = ?').all('IEZ51697949');

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
