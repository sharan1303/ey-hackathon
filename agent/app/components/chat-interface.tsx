'use client';

import { useState, useEffect, useRef } from 'react';
import { Bubble, Sender, useXAgent, useXChat } from '@ant-design/x';
import type { GetProp } from 'antd';
import { MessageBubble } from './message-bubble';
import { SettingsPanel } from './settings-panel';
import { MobileWelcomeScreen } from './welcome-screen-mobile';
import { DesktopWelcomeScreen } from './welcome-screen-desktop';
import {
  saveConversation,
  getConversations,
  getConversationMessages,
  useConversationMessages,
  useSaveConversation,
  useConversation,
  type Conversation,
  type ChatMessage,
  type ToolCallData,
} from '../lib/chat-api';
import { generateTitle } from '../lib/message-parser';
import { getBrowserDatabase } from '../lib/browser-db';

type BubbleItem = {
  key: string;
  loading: boolean;
  role: 'user' | 'assistant' | 'tool-call';
  content: string;
  toolCall?: ToolCallData;
};

interface ChatInterfaceProps {
  conversationId: string;
  onConversationUpdate?: (conversation: Conversation) => void;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  assistant: {placement: 'start'},
  user: {placement: 'end'}
};

export function ChatInterface({ conversationId, onConversationUpdate, isMobile, onToggleSidebar }: ChatInterfaceProps) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Track tool calls separately
  const [toolCalls, setToolCalls] = useState<Map<string, ChatMessage>>(new Map());

  // React Query hooks
  const { data: historicalMessages = [] } = useConversationMessages(conversationId);
  const { data: conversation } = useConversation(conversationId);
  const saveConversationMutation = useSaveConversation();
  
  const conversationTitle = conversation?.title || '';

  /**
   * Handle query request from server by executing it in browser database
   * and sending the result back to the server
   */
  const handleQueryRequest = async (queryId: string, sql: string, params: unknown[]) => {
    try {
      console.log(`🗄️ Executing query ${queryId} in browser...`);
      
      // Get browser database instance
      const browserDB = getBrowserDatabase();
      
      // Execute the query
      const result = await browserDB.query(sql, params);
      
      console.log(`✅ Query ${queryId} complete: ${result.values.length} rows`);
      
      // Send result back to server
      await fetch('/api/query-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queryId,
          result: {
            columns: result.columns,
            values: result.values,
          },
        }),
      });
      
      console.log(`📤 Query result ${queryId} sent to server`);
    } catch (error) {
      console.error(`❌ Query ${queryId} failed:`, error);
      
      // Send error back to server
      await fetch('/api/query-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queryId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }
  };

  // Create agent with custom request handler that supports streaming
  const [agent] = useXAgent({
    request: async ({ message }, { onUpdate, onSuccess, onError }) => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            threadId: conversationId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('API Error:', errorData);
          throw new Error(errorData.message || errorData.error || 'Failed to send message');
        }

        // Handle streaming response
        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';
        const currentToolCalls = new Map<string, ChatMessage>();

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            console.log('📦 Received chunk:', chunk.substring(0, 100));
            
            // Parse SSE events (format: "data: {...}\n\n")
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (!line.trim()) continue;
              if (!line.startsWith('data: ')) {
                console.warn('Line does not start with "data: ":', line);
                continue;
              }
              
              try {
                const jsonStr = line.substring(6); // Remove "data: " prefix
                console.log('📝 Parsing event:', jsonStr.substring(0, 100));
                const event = JSON.parse(jsonStr);
                console.log('✅ Parsed event:', event.type);
                
                if (event.type === 'tool-call') {
                  // Create a new tool call message
                  const toolCallMessage: ChatMessage = {
                    id: event.id,
                    role: 'tool-call',
                    content: '', // Tool calls don't have content
                    timestamp: Date.now(),
                    toolCall: {
                      toolName: event.toolName,
                      arguments: event.arguments,
                      status: 'pending',
                    },
                  };
                  
                  currentToolCalls.set(event.id, toolCallMessage);
                  setToolCalls(new Map(currentToolCalls));
                  
                  console.log('🔧 Tool call received:', event.toolName);
                } else if (event.type === 'tool-result') {
                  // Update existing tool call with result
                  const existingToolCall = currentToolCalls.get(event.id);
                  if (existingToolCall && existingToolCall.toolCall) {
                    existingToolCall.toolCall.result = event.result;
                    existingToolCall.toolCall.status = 'complete';
                    setToolCalls(new Map(currentToolCalls));
                    
                    console.log('✅ Tool result received:', event.toolName);
                  }
                } else if (event.type === 'query-request') {
                  // Execute query in browser database and send result back to server
                  console.log('🗄️ Query request received:', event.queryId);
                  handleQueryRequest(event.queryId, event.sql, event.params).catch((error) => {
                    console.error('❌ Query execution failed:', error);
                  });
                } else if (event.type === 'text-delta') {
                  // Accumulate text content
                  fullContent += event.content;
                  onUpdate({ data: fullContent });
                } else if (event.type === 'error') {
                  console.error('Stream error:', event.message);
                  throw new Error(event.message);
                }
              } catch (parseError) {
                console.error('Failed to parse SSE event:', parseError, line);
              }
            }
          }

          onSuccess([{ data: fullContent }]);
          
          // Update conversation after successful response
          if (message && fullContent) {
            updateConversationWithToolCalls(message, fullContent, Array.from(currentToolCalls.values()));
          }
          
          // Clear tool calls after saving
          setToolCalls(new Map());
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        console.error('Request error:', error);
        onError(error as Error);
      }
    },
  });

  // Manage chat messages with useXChat
  const { onRequest, messages } = useXChat({
    agent,
    requestPlaceholder: 'Thinking...',
    requestFallback: 'Sorry, something went wrong. Please try again.',
  });

  // Update conversation in storage (legacy method without tool calls)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateConversation = (userMessage: string, aiResponse: string) => {
    updateConversationWithToolCalls(userMessage, aiResponse, []);
  };

  // Update conversation in storage with tool calls
  const updateConversationWithToolCalls = (
    userMessage: string,
    aiResponse: string,
    toolCallMessages: ChatMessage[]
  ) => {
    const conversations = getConversations();
    let conversationData = conversations.find((c) => c.id === conversationId);

    // Create new messages
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    
    // Add tool call messages (they come between user and assistant)
    const toolCallMsgs = toolCallMessages.map((tc, index) => ({
      ...tc,
      timestamp: Date.now() + index + 1,
    }));
    
    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now() + toolCallMessages.length + 1,
    };

    // Get existing messages and append new ones
    const existingMessages = getConversationMessages(conversationId);
    const updatedMessages = [...existingMessages, userMsg, ...toolCallMsgs, assistantMsg];

    if (!conversationData) {
      conversationData = {
        id: conversationId,
        title: generateTitle(userMessage),
        lastMessage: aiResponse.substring(0, 100),
        timestamp: Date.now(),
        messageCount: updatedMessages.length,
        messages: updatedMessages,
      };
    } else {
      conversationData.lastMessage = aiResponse.substring(0, 100);
      conversationData.timestamp = Date.now();
      conversationData.messageCount = updatedMessages.length;
      conversationData.messages = updatedMessages;
    }

    // Use mutation to save conversation
    saveConversationMutation.mutate(conversationData);
    
    if (onConversationUpdate) {
      onConversationUpdate(conversationData);
    }
  };

  // Update isFirstMessage based on conversation data
  useEffect(() => {
    setIsFirstMessage(!conversation || conversation.messageCount === 0);
  }, [conversation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historicalMessages]);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;

    // Optimistically set the title for the first message
    if (isFirstMessage) {
      const newTitle = generateTitle(value);
      
      // Optimistically create/update conversation in storage
      const conversations = getConversations();
      const existingConversation = conversations.find((c) => c.id === conversationId);
      
      if (!existingConversation) {
        const optimisticConversation: Conversation = {
          id: conversationId,
          title: newTitle,
          lastMessage: value.substring(0, 100),
          timestamp: Date.now(),
          messageCount: 0,
          messages: [],
        };
        saveConversationMutation.mutate(optimisticConversation);
        
        if (onConversationUpdate) {
          onConversationUpdate(optimisticConversation);
        }
      }
    }

    onRequest(value);
    setContent('');
    setIsFirstMessage(false);
  };

  // Transform messages for Bubble.List
  // Combine historical messages with live chat messages and tool calls
  const allMessages = [
    // Historical messages from storage
    ...historicalMessages.map((msg) => ({
      key: msg.id,
      loading: false,
      role: msg.role,
      content: msg.content,
      toolCall: msg.toolCall,
    })),
    // Live messages from current chat session - only include messages that haven't been saved yet
    // We filter out messages that appear to already be in historicalMessages to prevent duplication
    ...messages
      .filter(({ message, status }) => {
        const messageContent = typeof message === 'string' 
          ? message 
          : (message as { data?: string })?.data || '';
        
        // Only include loading messages or messages not yet in historical messages
        if (status === 'loading') return true;
        
        // Check if this message content already exists in historical messages
        const isDuplicate = historicalMessages.some(
          (hm) => hm.content === messageContent && hm.role === (status === 'local' ? 'user' : 'assistant')
        );
        
        return !isDuplicate;
      })
      .map(({ id, message, status }) => {
        const messageContent = typeof message === 'string' 
          ? message 
          : (message as { data?: string })?.data || '';
        
        return {
          key: id,
          loading: status === 'loading',
          role: status === 'local' ? ('user' as const) : ('assistant' as const),
          content: messageContent,
        };
      }),
    // Live tool calls (currently in progress)
    ...Array.from(toolCalls.values()).map((tc) => ({
      key: tc.id,
      loading: false,
      role: 'tool-call' as const,
      content: '',
      toolCall: tc.toolCall,
    })),
  ];

  const bubbleItems = allMessages;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'white',
      }}
    >
      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Header */}
      <div
        style={{
          background: 'white',
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hamburger Menu Button - Mobile Only */}
          {isMobile && (
            <button
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
              style={{
                width: 32,
                height: 32,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>
            {conversationTitle || 'New chat'}
          </h2>
        </div>
        
        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open settings"
          style={{
            width: 32,
            height: 32,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m9.66-9.66l-5.197 5.197M6.464 6.464L1.267 1.267M23 12h-6m-6 0H1m20.732 6.732l-5.197-5.197M6.464 17.536L1.267 22.733" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '16px' : '0px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {isFirstMessage && historicalMessages.length === 0 && messages.length === 0 && (
            isMobile ? (
              <MobileWelcomeScreen
                content={content}
                onContentChange={setContent}
                onSubmit={handleSubmit}
                isLoading={agent.isRequesting()}
              />
            ) : (
              <DesktopWelcomeScreen
                content={content}
                onContentChange={setContent}
                onSubmit={handleSubmit}
                isLoading={agent.isRequesting()}
              />
            )
          )}

          {bubbleItems.length > 0 && (
            <Bubble.List
              roles={roles}
              items={bubbleItems.map((item) => {
                const { toolCall, ...bubbleProps } = item as BubbleItem;
                return {
                  ...bubbleProps,
                  content: (
                    <MessageBubble
                      content={item.content as string}
                      role={item.role}
                      loading={item.loading}
                      typing={item.role === 'assistant' && item.loading}
                      toolCall={toolCall}
                    />
                  ),
                };
              })}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Only shown when there are messages */}
      {bubbleItems.length > 0 && (
        <div
          style={{
            background: 'white',
            padding: isMobile ? '12px 16px' : '16px 24px',
          }}
        >
          <Sender
            value={content}
            onChange={setContent}
            onSubmit={handleSubmit}
            placeholder={isMobile ? "Ask me anything..." : "Ask about pricing, margins, or profitability..."}
            loading={agent.isRequesting()}
            style={{
              maxWidth: 900,
              margin: '0 auto',
            }}
          />
        </div>
      )}
    </div>
  );
}

