import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getSalesTransactions,
  getProductSales,
  calculateMarginPercent,
  calculateAveragePrice
} from '../lib/queries';

export const pricingAnalysisTool = createTool({
  id: 'pricing-analysis',
  description: `Analyze pricing strategies, variance, and compliance with catalogue prices.
  
  Use this tool when asked about:
  - Price variance between actual selling prices and catalogue prices
  - Pricing consistency across customers or over time
  - Discount impact on pricing and profitability
  - Price tier performance and catalogue compliance
  - Unusual pricing patterns or deviations
  
  The tool provides focused insights on pricing decisions and identifies areas where
  pricing strategy may need adjustment.`,
  
  inputSchema: z.object({
    analysisType: z.enum(['variance', 'consistency', 'catalogue_compliance', 'tier_performance'])
      .describe('Type of pricing analysis to perform'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    customerCode: z.string().optional().describe('Filter to specific customer code'),
    itemCode: z.string().optional().describe('Filter to specific product/item code'),
    priceTier: z.enum(['ie_trade', 'ie_high', 'ie_mid', 'ie_low', 'ie_base']).optional()
      .describe('Price tier to analyze against'),
    minVariancePercent: z.number().optional().default(5)
      .describe('Minimum price variance % to flag as significant'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return')
  }),
  
  outputSchema: z.union([
    // Price variance output
    z.object({
      analysisType: z.literal('variance'),
      summary: z.object({
        totalProducts: z.number(),
        productsWithVariance: z.number(),
        avgVariancePercent: z.number()
      }),
      items: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        cataloguePrice: z.number().nullable(),
        avgActualPrice: z.number(),
        priceVariance: z.number(),
        variancePercent: z.number(),
        transactionCount: z.number(),
        totalRevenue: z.number()
      }))
    }),
    // Consistency output
    z.object({
      analysisType: z.literal('consistency'),
      summary: z.object({
        totalProducts: z.number(),
        productsWithInconsistency: z.number(),
        avgPriceVariation: z.number()
      }),
      items: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        customerCode: z.string().optional(),
        customerName: z.string().optional(),
        minPrice: z.number(),
        maxPrice: z.number(),
        avgPrice: z.number(),
        priceRange: z.number(),
        variationPercent: z.number(),
        transactionCount: z.number()
      }))
    }),
    // Catalogue compliance output
    z.object({
      analysisType: z.literal('catalogue_compliance'),
      summary: z.object({
        totalTransactions: z.number(),
        compliantTransactions: z.number(),
        complianceRate: z.number()
      }),
      items: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        cataloguePrice: z.number().nullable(),
        avgActualPrice: z.number(),
        compliantCount: z.number(),
        nonCompliantCount: z.number(),
        compliancePercent: z.number()
      }))
    }),
    // Tier performance output
    z.object({
      analysisType: z.literal('tier_performance'),
      summary: z.object({
        totalRevenue: z.number(),
        totalMargin: z.number(),
        avgMarginPercent: z.number()
      }),
      items: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        cataloguePrice: z.number().nullable(),
        avgActualPrice: z.number(),
        transactionCount: z.number(),
        revenue: z.number(),
        margin: z.number()
      }))
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      analysisType, 
      startDate, 
      endDate, 
      customerCode, 
      itemCode,
      priceTier,
      minVariancePercent,
      limit 
    } = context;
    
    logger?.info('Executing pricing-analysis tool', {
      analysisType,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      filters: { customerCode, itemCode, priceTier }
    });
    
    if (analysisType === 'variance') {
      // Analyze price variance from catalogue prices
      const products = await getProductSales({
        startDate,
        endDate,
        includeReturns: true,
        includeSamples: false,
        itemCodes: itemCode ? [itemCode] : undefined,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit
      });
      
      const cataloguePriceField = priceTier ? `catalogue_price_${priceTier.replace('ie_', '')}` : 'catalogue_price_trade';
      
      const itemsWithVariance = products
        .filter(p => p.catalogue_price_trade !== null)
        .map(p => {
          const cataloguePrice = p.catalogue_price_trade!;
          const avgActualPrice = calculateAveragePrice(p.total_revenue, p.total_quantity);
          const variance = avgActualPrice - cataloguePrice;
          const variancePercent = (variance / cataloguePrice) * 100;
          
          return {
            itemCode: p.item_code,
            productDescription: p.product_description,
            cataloguePrice,
            avgActualPrice,
            priceVariance: variance,
            variancePercent,
            transactionCount: p.transaction_count,
            totalRevenue: p.total_revenue
          };
        })
        .filter(item => Math.abs(item.variancePercent) >= minVariancePercent!)
        .slice(0, limit);
      
      const avgVariance = itemsWithVariance.length > 0
        ? itemsWithVariance.reduce((sum, item) => sum + Math.abs(item.variancePercent), 0) / itemsWithVariance.length
        : 0;
      
      logger?.info('Price variance analysis complete', {
        totalProducts: products.length,
        productsWithVariance: itemsWithVariance.length,
        avgVariancePercent: avgVariance.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'variance' as const,
        summary: {
          totalProducts: products.length,
          productsWithVariance: itemsWithVariance.length,
          avgVariancePercent: avgVariance
        },
        items: itemsWithVariance
      };
      
    } else if (analysisType === 'consistency') {
      // Analyze price consistency across transactions
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        customerCode,
        itemCode,
        limit: 1000 // Get more transactions for analysis
      });
      
      // Group by item (and customer if specified)
      const groupKey = customerCode ? 'item_customer' : 'item';
      const grouped = new Map<string, typeof transactions>();
      
      transactions.forEach(t => {
        const key = groupKey === 'item_customer' 
          ? `${t.item_code}|${t.customer_code}` 
          : t.item_code;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(t);
      });
      
      const items = Array.from(grouped.entries())
        .map(([key, txns]) => {
          const prices = txns.map(t => t.unit_price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
          const priceRange = maxPrice - minPrice;
          const variationPercent = avgPrice > 0 ? (priceRange / avgPrice) * 100 : 0;
          
          const [itemCode, customerCodePart] = key.split('|');
          
          return {
            itemCode,
            productDescription: txns[0].product_description || '',
            customerCode: customerCodePart,
            customerName: customerCodePart ? txns[0].customer_name : undefined,
            minPrice,
            maxPrice,
            avgPrice,
            priceRange,
            variationPercent,
            transactionCount: txns.length
          };
        })
        .filter(item => item.variationPercent >= minVariancePercent! && item.transactionCount >= 3)
        .sort((a, b) => b.variationPercent - a.variationPercent)
        .slice(0, limit);
      
      const avgVariation = items.length > 0
        ? items.reduce((sum, item) => sum + item.variationPercent, 0) / items.length
        : 0;
      
      logger?.info('Price consistency analysis complete', {
        totalProducts: grouped.size,
        productsWithInconsistency: items.length,
        avgPriceVariation: avgVariation.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'consistency' as const,
        summary: {
          totalProducts: grouped.size,
          productsWithInconsistency: items.length,
          avgPriceVariation: avgVariation
        },
        items
      };
      
    } else if (analysisType === 'catalogue_compliance') {
      // Analyze compliance with catalogue prices
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        customerCode,
        itemCode,
        limit: 1000
      });
      
      const tolerance = 0.01; // 1% tolerance
      const grouped = new Map<string, typeof transactions>();
      
      transactions.forEach(t => {
        if (!grouped.has(t.item_code)) {
          grouped.set(t.item_code, []);
        }
        grouped.get(t.item_code)!.push(t);
      });
      
      const items = Array.from(grouped.entries())
        .map(([itemCode, txns]) => {
          const cataloguePrice = txns[0].catalogue_price_trade;
          if (!cataloguePrice) return null;
          
          const compliantCount = txns.filter(t => {
            const variance = Math.abs(t.unit_price - cataloguePrice) / cataloguePrice;
            return variance <= tolerance;
          }).length;
          
          const nonCompliantCount = txns.length - compliantCount;
          const compliancePercent = (compliantCount / txns.length) * 100;
          const avgActualPrice = txns.reduce((sum, t) => sum + t.unit_price, 0) / txns.length;
          
          return {
            itemCode,
            productDescription: txns[0].product_description || '',
            cataloguePrice,
            avgActualPrice,
            compliantCount,
            nonCompliantCount,
            compliancePercent
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .sort((a, b) => a.compliancePercent - b.compliancePercent)
        .slice(0, limit);
      
      const totalTransactions = transactions.length;
      const compliantTransactions = items.reduce((sum, item) => sum + item.compliantCount, 0);
      const complianceRate = totalTransactions > 0 ? (compliantTransactions / totalTransactions) * 100 : 0;
      
      logger?.info('Catalogue compliance analysis complete', {
        totalTransactions,
        compliantTransactions,
        complianceRate: complianceRate.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'catalogue_compliance' as const,
        summary: {
          totalTransactions,
          compliantTransactions,
          complianceRate
        },
        items
      };
      
    } else {
      // tier_performance
      const products = await getProductSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        itemCodes: itemCode ? [itemCode] : undefined,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit
      });
      
      const items = products
        .filter(p => p.catalogue_price_trade !== null)
        .map(p => {
          const avgActualPrice = calculateAveragePrice(p.total_revenue, p.total_quantity);
          const margin = p.total_revenue - p.total_cost;
          
          return {
            itemCode: p.item_code,
            productDescription: p.product_description,
            cataloguePrice: p.catalogue_price_trade,
            avgActualPrice,
            transactionCount: p.transaction_count,
            revenue: p.total_revenue,
            margin
          };
        });
      
      const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
      const totalMargin = items.reduce((sum, item) => sum + item.margin, 0);
      const avgMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
      
      logger?.info('Price tier performance analysis complete', {
        productsAnalyzed: items.length,
        totalRevenue: totalRevenue.toFixed(2),
        avgMarginPercent: avgMarginPercent.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'tier_performance' as const,
        summary: {
          totalRevenue,
          totalMargin,
          avgMarginPercent
        },
        items
      };
    }
  }
});

