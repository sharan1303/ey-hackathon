import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getCustomerProfitability, 
  getProductPerformance 
} from '../lib/database';

export const profitabilityTool = createTool({
  id: 'profitability-analysis',
  description: `Analyze profitability and performance of customers or products.
  
  Use this tool when asked about:
  - Most/least profitable customers or products
  - Customer or product rankings by revenue/margin
  - Top performing customers or products
  - Customer/product performance metrics
  
  Returns detailed profitability metrics including revenue, cost, margin, and transaction counts.
  Supports date filtering and various sorting options. Defaults to last 12 months.`,
  
  inputSchema: z.object({
    analyzeBy: z.enum(['customer', 'product']).describe('Analyze customers or products'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    sortBy: z.enum(['margin', 'revenue', 'margin_percent', 'quantity']).optional().default('margin')
      .describe('Sort results by: margin (total profit), revenue (total sales), margin_percent (margin %), or quantity (units sold)'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return'),
    includeReturns: z.boolean().optional().default(false).describe('Include returns in the analysis')
  }),
  
  outputSchema: z.array(z.object({
    code: z.string(),
    name: z.string(),
    revenue: z.number(),
    cost: z.number(),
    margin: z.number(),
    marginPercent: z.number(),
    transactionCount: z.number(),
    uniqueCount: z.number().describe('For customers: unique products. For products: unique customers'),
    avgOrderValue: z.number().optional(),
    quantity: z.number().optional()
  })),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { analyzeBy, startDate, endDate, sortBy, limit, includeReturns } = context;
    
    logger?.info('Executing profitability-analysis tool', {
      analyzeBy,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      sortBy,
      limit,
      includeReturns
    });
    
    if (analyzeBy === 'customer') {
      const results = getCustomerProfitability(
        startDate, 
        endDate, 
        includeReturns,
        sortBy as 'margin' | 'revenue' | 'margin_percent',
        limit
      );
      
      logger?.info('Profitability analysis complete', {
        analyzeBy: 'customer',
        recordCount: results.length,
        topMargin: results.length > 0 ? results[0].gross_margin.toFixed(2) : 'N/A',
        totalRevenue: results.reduce((sum, r) => sum + r.total_revenue, 0).toFixed(2)
      });
      
      return results.map(r => ({
        code: r.customer_code,
        name: r.customer_name,
        revenue: r.total_revenue,
        cost: r.total_cost,
        margin: r.gross_margin,
        marginPercent: r.margin_percent,
        transactionCount: r.transaction_count,
        uniqueCount: r.unique_products,
        avgOrderValue: r.avg_order_value,
        quantity: r.total_quantity
      }));
    } else {
      const results = getProductPerformance(
        startDate,
        endDate,
        sortBy as 'revenue' | 'margin' | 'quantity' | 'margin_percent',
        limit
      );
      
      logger?.info('Profitability analysis complete', {
        analyzeBy: 'product',
        recordCount: results.length,
        topMargin: results.length > 0 ? results[0].margin.toFixed(2) : 'N/A',
        totalRevenue: results.reduce((sum, r) => sum + r.revenue, 0).toFixed(2)
      });
      
      return results.map(r => ({
        code: r.item_code,
        name: r.product_description,
        revenue: r.revenue,
        cost: r.cost,
        margin: r.margin,
        marginPercent: r.margin_percent,
        transactionCount: r.transaction_count,
        uniqueCount: r.unique_customers,
        quantity: r.quantity_sold
      }));
    }
  }
});

