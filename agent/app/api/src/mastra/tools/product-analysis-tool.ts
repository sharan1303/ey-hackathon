import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { 
  getProductSales,
  getSalesTransactions,
  calculateMarginPercent
} from '../lib/queries';

export const productAnalysisTool = createTool({
  id: 'product-analysis',
  description: `Analyze product performance, slow-moving inventory, and cross-sell opportunities.
  
  Use this tool when asked about:
  - Product performance metrics and rankings
  - Slow-moving or stagnant inventory
  - Product mix and ABC classification
  - Cross-sell opportunities (products frequently bought together)
  - Product cannibalization patterns
  - Best and worst performing products
  
  Provides insights for inventory optimization and sales strategies.`,
  
  inputSchema: z.object({
    analysisType: z.enum(['slow_moving', 'product_mix', 'cross_sell', 'cannibalization'])
      .describe('Type of product analysis to perform'),
    startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
    endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
    itemCode: z.string().optional().describe('Filter to specific product/item code'),
    maxTransactionsPerMonth: z.number().optional().default(2)
      .describe('Maximum monthly transactions to classify as slow-moving'),
    minCoOccurrence: z.number().optional().default(5)
      .describe('Minimum times products must be bought together for cross-sell analysis'),
    minSharedCustomers: z.number().optional().default(5)
      .describe('Minimum shared customers for cannibalization analysis'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return')
  }),
  
  outputSchema: z.union([
    // Slow moving output
    z.object({
      analysisType: z.literal('slow_moving'),
      summary: z.object({
        totalProducts: z.number(),
        slowMovingCount: z.number(),
        totalValueAtRisk: z.number()
      }),
      products: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        transactionCount: z.number(),
        totalQuantitySold: z.number(),
        avgMonthlySales: z.number(),
        lastSaleDate: z.string(),
        daysSinceLastSale: z.number(),
        landedCost: z.number().nullable()
      }))
    }),
    // Product mix output
    z.object({
      analysisType: z.literal('product_mix'),
      summary: z.object({
        totalProducts: z.number(),
        totalRevenue: z.number(),
        totalMargin: z.number(),
        aClassCount: z.number(),
        bClassCount: z.number(),
        cClassCount: z.number()
      }),
      products: z.array(z.object({
        itemCode: z.string(),
        productDescription: z.string(),
        revenue: z.number(),
        revenuePercent: z.number(),
        margin: z.number(),
        marginPercent: z.number(),
        cumulativeRevenuePercent: z.number(),
        abcClassification: z.enum(['A', 'B', 'C'])
      }))
    }),
    // Cross-sell output
    z.object({
      analysisType: z.literal('cross_sell'),
      summary: z.object({
        totalPairs: z.number(),
        avgConfidence: z.number()
      }),
      opportunities: z.array(z.object({
        productACode: z.string(),
        productADescription: z.string(),
        productBCode: z.string(),
        productBDescription: z.string(),
        coOccurrenceCount: z.number(),
        customersBuyingBoth: z.number(),
        confidence: z.number()
      }))
    }),
    // Cannibalization output
    z.object({
      analysisType: z.literal('cannibalization'),
      summary: z.object({
        totalPairs: z.number(),
        productsAtRisk: z.number()
      }),
      pairs: z.array(z.object({
        productACode: z.string(),
        productADescription: z.string(),
        productBCode: z.string(),
        productBDescription: z.string(),
        sharedCustomers: z.number(),
        productARevenue: z.number(),
        productBRevenue: z.number(),
        competitionScore: z.number()
      }))
    })
  ]),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { 
      analysisType, 
      startDate, 
      endDate, 
      itemCode,
      maxTransactionsPerMonth,
      minCoOccurrence,
      minSharedCustomers,
      limit 
    } = context;
    
    logger?.info('Executing product-analysis tool', {
      analysisType,
      dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'default (last 12 months)',
      filters: { itemCode, maxTransactionsPerMonth, minCoOccurrence, minSharedCustomers }
    });
    
    if (analysisType === 'slow_moving') {
      // Identify slow-moving products
      const products = await getProductSales({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        itemCodes: itemCode ? [itemCode] : undefined,
        sortBy: 'transactions',
        sortOrder: 'asc',
        limit: 200
      });
      
      // Get transactions to calculate last sale date
      const allTransactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        itemCode,
        limit: 10000
      });
      
      const productMap = new Map<string, typeof allTransactions>();
      allTransactions.forEach(t => {
        if (!productMap.has(t.item_code)) {
          productMap.set(t.item_code, []);
        }
        productMap.get(t.item_code)!.push(t);
      });
      
      // Calculate date range in months
      const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
      const end = endDate ? new Date(endDate) : new Date();
      const monthsInRange = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      const today = new Date();
      const slowMovingProducts = products.map(p => {
        const transactions = productMap.get(p.item_code) || [];
        const dates = transactions.map(t => new Date(t.invoice_date)).sort((a, b) => b.getTime() - a.getTime());
        const lastSaleDate = dates.length > 0 ? dates[0] : start;
        const daysSinceLastSale = Math.floor((today.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
        const avgMonthlySales = p.total_quantity / monthsInRange;
        
        return {
          itemCode: p.item_code,
          productDescription: p.product_description,
          transactionCount: p.transaction_count,
          totalQuantitySold: p.total_quantity,
          avgMonthlySales,
          lastSaleDate: lastSaleDate.toISOString().split('T')[0],
          daysSinceLastSale,
          landedCost: p.landed_cost_euro
        };
      })
      .filter(p => p.avgMonthlySales <= maxTransactionsPerMonth!)
      .slice(0, limit);
      
      const totalValueAtRisk = slowMovingProducts
        .filter(p => p.landedCost !== null)
        .reduce((sum, p) => sum + (p.landedCost! * p.totalQuantitySold), 0);
      
      logger?.info('Slow-moving products analysis complete', {
        totalProducts: products.length,
        slowMovingCount: slowMovingProducts.length,
        totalValueAtRisk: totalValueAtRisk.toFixed(2)
      });
      
      return {
        analysisType: 'slow_moving' as const,
        summary: {
          totalProducts: products.length,
          slowMovingCount: slowMovingProducts.length,
          totalValueAtRisk
        },
        products: slowMovingProducts
      };
      
    } else if (analysisType === 'product_mix') {
      // ABC classification by revenue contribution
      const products = await getProductSales({
        startDate,
        endDate,
        includeReturns: true,
        includeSamples: false,
        sortBy: 'revenue',
        sortOrder: 'desc',
        limit: 500
      });
      
      const totalRevenue = products.reduce((sum, p) => sum + p.total_revenue, 0);
      const totalMargin = products.reduce((sum, p) => sum + (p.total_revenue - p.total_cost), 0);
      
      let cumulativeRevenue = 0;
      const analyzed = products.map(p => {
        const revenue = p.total_revenue;
        const margin = revenue - p.total_cost;
        const marginPercent = calculateMarginPercent(revenue, p.total_cost);
        
        cumulativeRevenue += revenue;
        const cumulativeRevenuePercent = (cumulativeRevenue / totalRevenue) * 100;
        
        // ABC Classification: A = top 80%, B = next 15%, C = bottom 5%
        let abcClassification: 'A' | 'B' | 'C';
        if (cumulativeRevenuePercent <= 80) {
          abcClassification = 'A';
        } else if (cumulativeRevenuePercent <= 95) {
          abcClassification = 'B';
        } else {
          abcClassification = 'C';
        }
        
        return {
          itemCode: p.item_code,
          productDescription: p.product_description,
          revenue,
          revenuePercent: (revenue / totalRevenue) * 100,
          margin,
          marginPercent,
          cumulativeRevenuePercent,
          abcClassification
        };
      }).slice(0, limit);
      
      const aClassCount = analyzed.filter(p => p.abcClassification === 'A').length;
      const bClassCount = analyzed.filter(p => p.abcClassification === 'B').length;
      const cClassCount = analyzed.filter(p => p.abcClassification === 'C').length;
      
      logger?.info('Product mix analysis complete', {
        totalProducts: products.length,
        aClass: aClassCount,
        bClass: bClassCount,
        cClass: cClassCount
      });
      
      return {
        analysisType: 'product_mix' as const,
        summary: {
          totalProducts: products.length,
          totalRevenue,
          totalMargin,
          aClassCount,
          bClassCount,
          cClassCount
        },
        products: analyzed
      };
      
    } else if (analysisType === 'cross_sell') {
      // Find products frequently bought together
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        limit: 10000
      });
      
      // Group transactions by invoice (customer + date as proxy)
      const invoiceMap = new Map<string, typeof transactions>();
      transactions.forEach(t => {
        const invoiceKey = `${t.invoice_number}|${t.customer_code}`;
        if (!invoiceMap.has(invoiceKey)) {
          invoiceMap.set(invoiceKey, []);
        }
        invoiceMap.get(invoiceKey)!.push(t);
      });
      
      // Find product pairs
      const pairMap = new Map<string, { count: number; customers: Set<string>; a: string; b: string; aDesc: string; bDesc: string }>();
      
      invoiceMap.forEach(txns => {
        const uniqueProducts = Array.from(new Set(txns.map(t => t.item_code)));
        
        for (let i = 0; i < uniqueProducts.length; i++) {
          for (let j = i + 1; j < uniqueProducts.length; j++) {
            const productA = uniqueProducts[i];
            const productB = uniqueProducts[j];
            const pairKey = [productA, productB].sort().join('|');
            
            if (!pairMap.has(pairKey)) {
              const txnA = txns.find(t => t.item_code === productA)!;
              const txnB = txns.find(t => t.item_code === productB)!;
              pairMap.set(pairKey, {
                count: 0,
                customers: new Set(),
                a: productA,
                b: productB,
                aDesc: txnA.product_description || '',
                bDesc: txnB.product_description || ''
              });
            }
            
            const pair = pairMap.get(pairKey)!;
            pair.count++;
            pair.customers.add(txns[0].customer_code);
          }
        }
      });
      
      const opportunities = Array.from(pairMap.values())
        .filter(pair => pair.count >= minCoOccurrence!)
        .map(pair => {
          const totalATransactions = transactions.filter(t => t.item_code === pair.a).length;
          const confidence = totalATransactions > 0 ? (pair.count / totalATransactions) * 100 : 0;
          
          return {
            productACode: pair.a,
            productADescription: pair.aDesc,
            productBCode: pair.b,
            productBDescription: pair.bDesc,
            coOccurrenceCount: pair.count,
            customersBuyingBoth: pair.customers.size,
            confidence
          };
        })
        .sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount)
        .slice(0, limit);
      
      const avgConfidence = opportunities.length > 0
        ? opportunities.reduce((sum, o) => sum + o.confidence, 0) / opportunities.length
        : 0;
      
      logger?.info('Cross-sell analysis complete', {
        totalPairs: pairMap.size,
        qualifyingPairs: opportunities.length,
        avgConfidence: avgConfidence.toFixed(2) + '%'
      });
      
      return {
        analysisType: 'cross_sell' as const,
        summary: {
          totalPairs: pairMap.size,
          avgConfidence
        },
        opportunities
      };
      
    } else {
      // cannibalization analysis
      const transactions = await getSalesTransactions({
        startDate,
        endDate,
        includeReturns: false,
        includeSamples: false,
        limit: 10000
      });
      
      // Map customers to products
      const customerProductMap = new Map<string, Set<string>>();
      const productRevenueMap = new Map<string, number>();
      const productDescMap = new Map<string, string>();
      
      transactions.forEach(t => {
        if (!customerProductMap.has(t.customer_code)) {
          customerProductMap.set(t.customer_code, new Set());
        }
        customerProductMap.get(t.customer_code)!.add(t.item_code);
        
        productRevenueMap.set(t.item_code, (productRevenueMap.get(t.item_code) || 0) + t.line_total);
        productDescMap.set(t.item_code, t.product_description || '');
      });
      
      // Find product pairs with shared customers
      const productPairMap = new Map<string, { productA: string; productB: string; sharedCustomers: number }>();
      const products = Array.from(productRevenueMap.keys());
      
      for (let i = 0; i < products.length && i < 100; i++) {
        for (let j = i + 1; j < products.length && j < 100; j++) {
          const productA = products[i];
          const productB = products[j];
          
          let sharedCount = 0;
          customerProductMap.forEach(productSet => {
            if (productSet.has(productA) && productSet.has(productB)) {
              sharedCount++;
            }
          });
          
          if (sharedCount >= minSharedCustomers!) {
            const pairKey = [productA, productB].sort().join('|');
            productPairMap.set(pairKey, {
              productA,
              productB,
              sharedCustomers: sharedCount
            });
          }
        }
      }
      
      const pairs = Array.from(productPairMap.values())
        .map(pair => {
          const revenueA = productRevenueMap.get(pair.productA) || 0;
          const revenueB = productRevenueMap.get(pair.productB) || 0;
          // Higher score = more competition (similar revenue + many shared customers)
          const competitionScore = pair.sharedCustomers / (1 + Math.abs(revenueA - revenueB) / Math.max(revenueA, revenueB));
          
          return {
            productACode: pair.productA,
            productADescription: productDescMap.get(pair.productA) || '',
            productBCode: pair.productB,
            productBDescription: productDescMap.get(pair.productB) || '',
            sharedCustomers: pair.sharedCustomers,
            productARevenue: revenueA,
            productBRevenue: revenueB,
            competitionScore
          };
        })
        .sort((a, b) => b.competitionScore - a.competitionScore)
        .slice(0, limit);
      
      const productsAtRisk = new Set([...pairs.map(p => p.productACode), ...pairs.map(p => p.productBCode)]).size;
      
      logger?.info('Cannibalization analysis complete', {
        totalPairs: productPairMap.size,
        pairsAnalyzed: pairs.length,
        productsAtRisk
      });
      
      return {
        analysisType: 'cannibalization' as const,
        summary: {
          totalPairs: productPairMap.size,
          productsAtRisk
        },
        pairs
      };
    }
  }
});

