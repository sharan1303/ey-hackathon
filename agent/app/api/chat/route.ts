import { NextRequest } from 'next/server';
import { pricingAgent } from '../../api/src/mastra';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  message: string;
  threadId?: string;
}

export async function POST(req: NextRequest) {
  try {
    console.log('📨 Received chat request');
    
    const { message, threadId }: ChatRequest = await req.json();
    console.log('💬 Message:', message);
    console.log('🔗 Thread ID:', threadId);

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate thread ID if not provided
    const conversationId = threadId || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 Conversation ID:', conversationId);

    console.log('🤖 Calling pricing agent with streaming...');
    
    // Create a readable stream for SSE (Server-Sent Events)
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Use Mastra agent's stream method for streaming responses
          const streamResult = await pricingAgent.stream(
            [{ role: 'user', content: message }],
            {
              threadId: conversationId,
              resourceId: conversationId,
            }
          );

          // Stream text and tool calls
          for await (const chunk of streamResult.textStream) {
            // Send text chunks
            controller.enqueue(encoder.encode(chunk));
          }

          console.log('✅ Streaming complete');
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`\n\n[Error: ${errorMessage}]`));
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Thread-ID': conversationId,
      },
    });
  } catch (error) {
    console.error('❌ Chat API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process message', 
        message: errorMessage
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

