import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send a tool call event
        const toolCallEvent = {
          type: 'tool-call',
          id: 'test_1',
          toolName: 'testTool',
          arguments: { test: 'value' },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolCallEvent)}\n\n`));
        console.log('Sent tool call event');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Send a tool result event
        const toolResultEvent = {
          type: 'tool-result',
          id: 'test_1',
          toolName: 'testTool',
          result: { result: 'success' },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolResultEvent)}\n\n`));
        console.log('Sent tool result event');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Send text deltas
        const words = ['Hello', ' ', 'world', '!', ' ', 'This', ' ', 'is', ' ', 'a', ' ', 'test', '.'];
        for (const word of words) {
          const textEvent = {
            type: 'text-delta',
            content: word,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(textEvent)}\n\n`));
          console.log('Sent text event:', word);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('Stream complete');
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

