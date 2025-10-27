import Database from 'better-sqlite3';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'voltura_data.db');

/**
 * Example queries to demonstrate how to use the database
 */
class DatabaseQueries {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH, { readonly: true });
  }

  // Get all catalogue prices for a specific item
  getCataloguePriceByItem(itemCode: string) {
    const stmt = this.db.prepare('SELECT * FROM catalogue_prices WHERE item_code = ?');
    return stmt.get(itemCode);
  }

  // Get sales summary by customer
  getSalesByCustomer(customerCode: string) {
    const stmt = this.db.prepare(`
      SELECT 
        customer_code,
        customer_name,
        COUNT(*) as total_orders,
        SUM(quantity) as total_quantity,
        SUM(line_total) as total_revenue
      FROM sales 
      WHERE customer_code = ?
      GROUP BY customer_code, customer_name
    `);
    return stmt.get(customerCode);
  }

  // Get top selling products
  getTopSellingProducts(limit: number = 10) {
    const stmt = this.db.prepare(`
      SELECT 
        item_code,
        SUM(quantity) as total_quantity_sold,
        SUM(line_total) as total_revenue,
        COUNT(DISTINCT customer_code) as unique_customers
      FROM sales
      GROUP BY item_code
      ORDER BY total_quantity_sold DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Get sales with pricing information
  getSalesWithPricing(itemCode: string) {
    const stmt = this.db.prepare(`
      SELECT 
        s.*,
        c.ie_trade,
        c.ie_high,
        l.landed_cost_euro
      FROM sales s
      LEFT JOIN catalogue_prices c ON s.item_code = c.item_code
      LEFT JOIN landed_costs l ON s.item_code = l.item_code
      WHERE s.item_code = ?
      LIMIT 100
    `);
    return stmt.all(itemCode);
  }

  // Get all customers who bought a specific product
  getCustomersForProduct(itemCode: string) {
    const stmt = this.db.prepare(`
      SELECT DISTINCT
        customer_code,
        customer_name,
        SUM(quantity) as total_purchased,
        SUM(line_total) as total_spent
      FROM sales
      WHERE item_code = ?
      GROUP BY customer_code, customer_name
      ORDER BY total_spent DESC
    `);
    return stmt.all(itemCode);
  }

  // Get sales statistics by month
  getSalesStatsByMonth() {
    const stmt = this.db.prepare(`
      SELECT 
        strftime('%Y-%m', invoice_date) as month,
        COUNT(*) as order_count,
        SUM(quantity) as total_quantity,
        SUM(line_total) as total_revenue,
        AVG(line_total) as avg_order_value
      FROM sales
      WHERE invoice_date IS NOT NULL AND invoice_date != ''
      GROUP BY month
      ORDER BY month
    `);
    return stmt.all();
  }

  close() {
    this.db.close();
  }
}

// Example usage
if (require.main === module) {
  const queries = new DatabaseQueries();

  console.log('\n=== Database Query Examples ===\n');

  // Example 1: Top selling products
  console.log('Top 5 Selling Products:');
  const topProducts = queries.getTopSellingProducts(5);
  console.table(topProducts);

  // Example 2: Sales statistics by month
  console.log('\nSales Statistics by Month:');
  const monthlyStats = queries.getSalesStatsByMonth();
  console.table(monthlyStats.slice(0, 10)); // Show first 10 months

  queries.close();
  console.log('\n=== Queries Complete ===\n');
}

export default DatabaseQueries;

