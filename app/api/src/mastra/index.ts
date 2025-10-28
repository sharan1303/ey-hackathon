import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { pricingAgent } from './agents/pricing-agent';

export const mastra = new Mastra({
  agents: {
    pricingAgent
  },
  logger: new PinoLogger({
    name: 'Pricing Agent System',
    level: 'info',
  }),
});

// Export the agent for direct use
export { pricingAgent };

