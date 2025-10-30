import { NextRequest } from 'next/server';
import { pricingAgent } from '../../api/src/mastra';
import { queryExecutorContext } from '../../api/src/mastra/lib/query-executor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequest {
  message: string;
  threadId?: string;
}

interface MastraToolCall {
  toolCallId?: string;
  toolName?: string;
  payload?: {
    toolName?: string;
    args?: Record<string, unknown>;
  };
  args?: Record<string, unknown>;
}

interface MastraToolResult {
  toolCallId?: string;
  toolName?: string;
  result?: unknown;
  payload?: {
    toolName?: string;
    result?: unknown;
  };
}

interface MastraStepFinishEvent {
  toolCalls?: MastraToolCall[];
  toolResults?: MastraToolResult[];
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
          console.log('🚀 Starting stream...');
          
          // Set up query executor context for this request
          // This allows database queries to send query-request events to the client
          await queryExecutorContext.run(
            { encoder, controller, threadId: conversationId },
            async () => {
              // Track tool calls that have been started
              const toolCallsInProgress = new Map<string, { toolName: string; args: Record<string, unknown> }>();
              let stepCounter = 0;
              
              // First, collect the stream result with callback
              const streamResult = await pricingAgent.stream(
            [{ role: 'user', content: message }],
            {
              threadId: conversationId,
              resourceId: conversationId,
              onStepFinish: ({ toolCalls, toolResults }: MastraStepFinishEvent) => {
                stepCounter++;
                console.log(`📍 Step ${stepCounter} finished`);
                
                // Handle tool calls (when tools are invoked)
                if (toolCalls && toolCalls.length > 0) {
                  console.log(`  - Found ${toolCalls.length} tool calls`);
                  toolCalls.forEach((call) => {
                    const toolName = call.payload?.toolName || call.toolName || 'unknown';
                    const args = call.payload?.args || call.args || {};
                    const toolCallId = call.toolCallId || `tc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Store tool call info
                    toolCallsInProgress.set(toolCallId, { toolName, args });
                    
                    // Emit tool call event
                    const event = {
                      type: 'tool-call',
                      id: toolCallId,
                      toolName,
                      arguments: args,
                    };
                    
                    const eventStr = `data: ${JSON.stringify(event)}\n\n`;
                    console.log('📤 Sending tool call event:', eventStr.substring(0, 100));
                    controller.enqueue(encoder.encode(eventStr));
                  });
                }
                
                // Handle tool results (when tools complete)
                if (toolResults && toolResults.length > 0) {
                  console.log(`  - Found ${toolResults.length} tool results`);
                  toolResults.forEach((result, index) => {
                    const resultData = result.payload?.result || result.result;
                    const toolName = result.payload?.toolName || result.toolName || `Tool ${index + 1}`;
                    
                    // Find matching tool call ID
                    let toolCallId = result.toolCallId;
                    if (!toolCallId) {
                      // Try to match by tool name
                      for (const [id, info] of toolCallsInProgress.entries()) {
                        if (info.toolName === toolName) {
                          toolCallId = id;
                          break;
                        }
                      }
                      // If still not found, generate one
                      if (!toolCallId) {
                        toolCallId = `tc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                      }
                    }
                    
                    // Emit tool result event
                    const event = {
                      type: 'tool-result',
                      id: toolCallId,
                      toolName,
                      result: resultData,
                    };
                    
                    const eventStr = `data: ${JSON.stringify(event)}\n\n`;
                    console.log('📤 Sending tool result event:', eventStr.substring(0, 100));
                    controller.enqueue(encoder.encode(eventStr));
                  });
                }
              },
            }
          );

              console.log('📝 Starting to stream text...');
              let chunkCount = 0;
              // Stream text chunks
              for await (const chunk of streamResult.textStream) {
                chunkCount++;
                const event = {
                  type: 'text-delta',
                  content: chunk,
                };
                
                if (chunkCount === 1) {
                  console.log('📤 Sending first text chunk:', chunk.substring(0, 50));
                }
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              }

              console.log(`✅ Streaming complete - sent ${chunkCount} text chunks`);
            }
          ); // End queryExecutorContext.run
          
          controller.close();
        } catch (error) {
          console.error('❌ Streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorEvent = {
            type: 'error',
            message: errorMessage,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    // Return streaming response with SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
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

