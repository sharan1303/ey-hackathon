import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getCustomerProfitability, 
  getProductPerformance 
} from '../lib/queries';

export const marginAnalysisTool = createTool({
  id: 'margin-analysis',
  description: `Comprehensive margin analysis for customers or products with flexible filtering and sorting.
  
  Use this tool when asked about:
  - Profit margins at any threshold (negative, low, medium, high margins)
  - Most/least profitable customers or products
  - Customer or product rankings by revenue/margin
  - Top performing customers or products
  - Margin analysis within specific ranges
  - Customers or products losing money (negative margins)
  
  This tool provides complete flexibility to analyze margins at ANY level:
  - Negative margins: Set maxMarginPercent=0
  - Low margins: Set maxMarginPercent=20, sortBy='margin_percent', order='asc'
  - High margins: Set minMarginPercent=50, sortBy='margin_percent', order='desc'
  - Top performers by total profit: sortBy='margin', order='desc'
  - Specific margin range: Set both minMarginPercent and maxMarginPercent
  
  Additional filters help focus on significant business:
  - minTransactions: Only include customers/products with sufficient activity
  - minRevenue: Only include customers/products above revenue threshold
  
  Returns detailed metrics including revenue, cost, margin (total profit), margin %, and transaction counts.
  Supports date filtering. Defaults to last 12 months if no dates provided.`,
  
  inputSchema: z.object({
    analyzeBy: z.enum(['customer', 'product']).describe('Analyze customers or products'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    sortBy: z.enum(['margin', 'revenue', 'margin_percent', 'quantity']).optional().default('margin')
      .describe('Sort results by: margin (total profit), revenue (total sales), margin_percent (margin %), or quantity (units sold)'),
    order: z.enum(['asc', 'desc']).optional().default('desc')
      .describe('Sort order: desc for highest first (most profitable), asc for lowest first (least profitable)'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return'),
    
    // Margin filters
    minMarginPercent: z.number().optional()
      .describe('Minimum margin percentage to include (e.g., 50 for margins above 50%)'),
    maxMarginPercent: z.number().optional()
      .describe('Maximum margin percentage to include (e.g., 0 for negative margins, 20 for low margins)'),
    
    // Activity filters
    minTransactions: z.number().optional()
      .describe('Minimum number of transactions to include (filters out one-time or low-activity entries)'),
    minRevenue: z.number().optional()
      .describe('Minimum revenue to include (filters out low-value customers/products)'),
    
    includeReturns: z.boolean().optional().default(false)
      .describe('Include returns in the analysis (customer analysis only)')
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
    const { 
      analyzeBy, 
      startDate, 
      endDate, 
      sortBy, 
      order, 
      limit,
      minMarginPercent,
      maxMarginPercent,
      minTransactions,
      minRevenue,
      includeReturns 
    } = context;
    
    logger?.info('Executing margin-analysis tool', {
      analyzeBy,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      sortBy,
      order,
      limit,
      filters: {
        minMarginPercent,
        maxMarginPercent,
        minTransactions,
        minRevenue,
        includeReturns: analyzeBy === 'customer' ? includeReturns : 'N/A'
      }
    });
    
    if (analyzeBy === 'customer') {
      const results = getCustomerProfitability({
        startDate,
        endDate,
        includeReturns,
        sortBy: sortBy as 'margin' | 'revenue' | 'margin_percent',
        order,
        limit,
        minMarginPercent,
        maxMarginPercent,
        minTransactions,
        minRevenue
      });
      
      logger?.info('Margin analysis complete', {
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
      const results = getProductPerformance({
        startDate,
        endDate,
        sortBy: sortBy as 'revenue' | 'margin' | 'quantity' | 'margin_percent',
        order,
        limit,
        minMarginPercent,
        maxMarginPercent,
        minTransactions,
        minRevenue
      });
      
      logger?.info('Margin analysis complete', {
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
