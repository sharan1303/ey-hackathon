import 'dotenv/config';
import { pricingAgent } from '..';

/**
 * Logging callback for agent steps
 */
function stepLogger({ text, toolCalls, toolResults, finishReason, usage }: any) {
  if (toolCalls && toolCalls.length > 0) {
    console.log('\n🔧 Tool Calls:');
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
        if (resultData.length > 0 && resultData.length <= 3) {
          console.log('     Data:', JSON.stringify(resultData, null, 2).split('\n').join('\n     '));
        } else if (resultData.length > 0) {
          console.log('     Sample:', JSON.stringify(resultData[0], null, 2).split('\n').join('\n     '));
        }
      } else {
        console.log(`   • ${toolName}:`, JSON.stringify(resultData, null, 2).split('\n').join('\n     '));
      }
    });
  }
  
  if (usage) {
    console.log('📊 Token Usage:', `${usage.promptTokens || usage.inputTokens || 0} prompt + ${usage.completionTokens || usage.outputTokens || 0} completion = ${usage.totalTokens || 0} total`);
  }
}

/**
 * Interactive single query for testing
 * Usage: pnpm query "Your question here"
 */
async function query(question: string) {
  console.log('🤖 Pricing Analysis Agent\n');
  console.log('Question:', question);
  console.log('-'.repeat(80));
  
  try {
    const response = await pricingAgent.generate(question, {
      onStepFinish: stepLogger
    });
    console.log('\n💬 Final Response:\n');
    console.log(response.text + '\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
    throw error;
  }
}

// Get question from command line arguments
const question = process.argv.slice(2).join(' ');

if (!question) {
  console.error('Usage: pnpm query "Your question here"');
  console.error('\nExamples:');
  console.error('  pnpm query "Show me customers with negative margins"');
  console.error('  pnpm query "What are our top 10 products by revenue?"');
  console.error('  pnpm query "Give me an executive dashboard for 2024"');
  process.exit(1);
}

query(question)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

