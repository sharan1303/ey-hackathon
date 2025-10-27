import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getNegativeMarginsByCustomer, 
  getNegativeMarginsBySKU 
} from '../lib/database';

export const marginAnalysisTool = createTool({
  id: 'margin-analysis',
  description: `Analyze profit margins by customer or product to identify negative margins (selling below cost).
  
  Use this tool when asked about:
  - Customers or products losing money
  - Negative margins or unprofitable sales
  - Which customers/SKUs are sold below cost
  - Margin analysis by customer or product
  
  Supports date filtering (YYYY-MM-DD format). Defaults to last 12 months if no dates provided.`,
  
  inputSchema: z.object({
    groupBy: z.enum(['customer', 'sku']).describe('Analyze margins by customer or by SKU (product)'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (e.g., 2024-01-01)'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format (e.g., 2024-12-31)'),
    onlyNegative: z.boolean().default(true).describe('Show only negative margins (true) or all margins (false)'),
    minTransactions: z.number().optional().default(5).describe('For SKU analysis: minimum number of transactions to include')
  }),
  
  outputSchema: z.array(z.object({
    code: z.string(),
    name: z.string(),
    revenue: z.number(),
    cost: z.number(),
    margin: z.number(),
    marginPercent: z.number(),
    transactionCount: z.number()
  })),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { groupBy, startDate, endDate, minTransactions } = context;
    
    logger?.info('Executing margin-analysis tool', {
      groupBy,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      minTransactions: groupBy === 'sku' ? minTransactions : 'N/A'
    });
    
    if (groupBy === 'customer') {
      const results = getNegativeMarginsByCustomer(startDate, endDate, false);
      logger?.info('Margin analysis complete', {
        groupBy: 'customer',
        recordCount: results.length,
        totalNegativeMargin: results.reduce((sum, r) => sum + (r.total_margin < 0 ? r.total_margin : 0), 0).toFixed(2)
      });
      return results.map(r => ({
        code: r.customer_code,
        name: r.customer_name,
        revenue: r.total_revenue,
        cost: r.total_cost,
        margin: r.total_margin,
        marginPercent: r.margin_percent,
        transactionCount: r.transaction_count
      }));
    } else {
      const results = getNegativeMarginsBySKU(startDate, endDate, minTransactions);
      logger?.info('Margin analysis complete', {
        groupBy: 'sku',
        recordCount: results.length,
        totalNegativeMargin: results.reduce((sum, r) => sum + (r.total_margin < 0 ? r.total_margin : 0), 0).toFixed(2)
      });
      return results.map(r => ({
        code: r.item_code,
        name: r.product_description,
        revenue: r.total_revenue,
        cost: r.total_cost,
        margin: r.total_margin,
        marginPercent: r.margin_percent,
        transactionCount: r.transaction_count
      }));
    }
  }
});

