import 'dotenv/config';
import { pricingAgent } from '../mastra';

/**
 * Logging callback for agent steps
 */
function createStepLogger(queryNumber: number) {
  let stepCount = 0;
  return ({ text, toolCalls, toolResults, finishReason, usage }: any) => {
    stepCount++;
    console.log(`\n📍 Step ${stepCount}:`);
    
    if (toolCalls && toolCalls.length > 0) {
      console.log('🔧 Tool Calls:');
      toolCalls.forEach((call: any) => {
        const toolName = call.payload?.toolName || call.toolName || 'unknown';
        const args = call.payload?.args || call.args || {};
        console.log(`   • ${toolName}`);
        console.log('     Args:', JSON.stringify(args, null, 2).split('\n').join('\n     '));
      });
    }
    
    if (toolResults && toolResults.length > 0) {
      console.log('✅ Tool Results:');
      toolResults.forEach((result: any, index: number) => {
        const resultData = result.payload?.result || result.result;
        const toolName = result.payload?.toolName || result.toolName || `Tool ${index + 1}`;
        if (Array.isArray(resultData)) {
          console.log(`   • ${toolName}: Returned ${resultData.length} records`);
          if (resultData.length > 0) {
            console.log('     Sample:', JSON.stringify(resultData[0], null, 2).split('\n').join('\n     '));
          }
        } else {
          console.log(`   • ${toolName}:`, JSON.stringify(resultData, null, 2).split('\n').join('\n     '));
        }
      });
    }
    
    if (text) {
      console.log('📝 Agent Text:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
    }
    
    if (usage) {
      console.log('📊 Token Usage:', `${usage.promptTokens || usage.inputTokens || 0} prompt + ${usage.completionTokens || usage.outputTokens || 0} completion = ${usage.totalTokens || 0} total`);
    }
    
    if (finishReason) {
      console.log('🏁 Finish Reason:', finishReason);
    }
  };
}

/**
 * Example queries demonstrating the Pricing Analysis Agent capabilities
 */
async function main() {
  console.log('🤖 Pricing Analysis Agent - Example Queries with Logging\n');
  console.log('=' .repeat(80));
  console.log('Logging is enabled to show tool calls and agent reasoning');
  console.log('=' .repeat(80));
  console.log('\n');

  // Example 1: Find customers with negative margins
  console.log('📊 Query 1: Find unprofitable customers');
  console.log('-'.repeat(80));
  try {
    const response1 = await pricingAgent.generate(
      'Show me the top 10 customers with negative margins for 2024. I need to understand which customers are losing us money.',
      {
        onStepFinish: createStepLogger(1)
      }
    );
    console.log('\n💬 Final Response:\n');
    console.log(response1.text);
  } catch (error) {
    console.error('Error:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 2: Identify products sold below cost
  console.log('📦 Query 2: Products sold below cost');
  console.log('-'.repeat(80));
  try {
    const response2 = await pricingAgent.generate(
      'Which products are we selling below cost? Show me SKUs with negative margins.',
      {
        onStepFinish: createStepLogger(2)
      }
    );
    console.log('\n💬 Final Response:\n');
    console.log(response2.text);
  } catch (error) {
    console.error('Error:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 3: Executive dashboard for a quarter
  console.log('📈 Query 3: Executive dashboard for Q1 2024');
  console.log('-'.repeat(80));
  try {
    const response3 = await pricingAgent.generate(
      'Give me an executive dashboard for Q1 2024 (January to March). Show me overall performance metrics.',
      {
        onStepFinish: createStepLogger(3)
      }
    );
    console.log('\n💬 Final Response:\n');
    console.log(response3.text);
  } catch (error) {
    console.error('Error:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 4: Top customers by profitability
  console.log('👥 Query 4: Most profitable customers');
  console.log('-'.repeat(80));
  try {
    const response4 = await pricingAgent.generate(
      'Who are our top 15 most profitable customers? Rank them by total margin.',
      {
        onStepFinish: createStepLogger(4)
      }
    );
    console.log('\n💬 Final Response:\n');
    console.log(response4.text);
  } catch (error) {
    console.error('Error:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 5: Problem areas requiring attention
  console.log('⚠️  Query 5: What needs immediate attention?');
  console.log('-'.repeat(80));
  try {
    const response5 = await pricingAgent.generate(
      'What are the biggest problems right now that need immediate attention? Show me problem areas.',
      {
        onStepFinish: createStepLogger(5)
      }
    );
    console.log('\n💬 Final Response:\n');
    console.log(response5.text);
  } catch (error) {
    console.error('Error:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Example 6: Product performance
  console.log('🏆 Query 6: Top performing products');
  console.log('-'.repeat(80));
  try {
    const response6 = await pricingAgent.generate(
      'Show me our top 20 products by revenue for the last 6 months',
      {
        onStepFinish: createStepLogger(6)
      }
    );
    console.log('\n💬 Final Response:\n');
    console.log(response6.text);
  } catch (error) {
    console.error('Error:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  console.log('✅ All example queries completed!\n');
}

export { main };

// Run if executed directly (ES module way)
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

