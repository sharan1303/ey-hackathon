'use client';

import { useState, useEffect, useRef } from 'react';
import { Bubble, Sender, useXAgent, useXChat } from '@ant-design/x';
import type { GetProp } from 'antd';
import { MessageBubble } from './message-bubble';
import {
  saveConversation,
  getConversations,
  getConversationMessages,
  type Conversation,
  type ChatMessage,
} from '../lib/chat-api';
import { generateTitle } from '../lib/message-parser';

interface ChatInterfaceProps {
  conversationId: string;
  onConversationUpdate?: (conversation: Conversation) => void;
}

const roles: GetProp<typeof Bubble.List, 'roles'> = {
  assistant: {placement: 'start'},
  user: {placement: 'end'}
};

export function ChatInterface({ conversationId, onConversationUpdate }: ChatInterfaceProps) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [historicalMessages, setHistoricalMessages] = useState<ChatMessage[]>([]);
  const [conversationTitle, setConversationTitle] = useState<string>('');

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

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            
            // Update the UI with each chunk for real-time streaming
            onUpdate({ data: fullContent });
          }

          onSuccess([{ data: fullContent }]);
          
          // Update conversation after successful response
          if (message && fullContent) {
            updateConversation(message, fullContent);
          }
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

  // Update conversation in storage
  const updateConversation = (userMessage: string, aiResponse: string) => {
    const conversations = getConversations();
    let conversation = conversations.find((c) => c.id === conversationId);

    // Create new messages
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    
    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now() + 1,
    };

    // Get existing messages and append new ones
    const existingMessages = getConversationMessages(conversationId);
    const updatedMessages = [...existingMessages, userMsg, assistantMsg];

    if (!conversation) {
      conversation = {
        id: conversationId,
        title: generateTitle(userMessage),
        lastMessage: aiResponse.substring(0, 100),
        timestamp: Date.now(),
        messageCount: updatedMessages.length,
        messages: updatedMessages,
      };
    } else {
      conversation.lastMessage = aiResponse.substring(0, 100);
      conversation.timestamp = Date.now();
      conversation.messageCount = updatedMessages.length;
      conversation.messages = updatedMessages;
    }

    saveConversation(conversation);
    
    // Update historical messages state
    setHistoricalMessages(updatedMessages);
    
    // Update the conversation title state
    setConversationTitle(conversation.title);
    
    if (onConversationUpdate) {
      onConversationUpdate(conversation);
    }
  };

  // Load historical messages when conversation changes
  useEffect(() => {
    const loadedMessages = getConversationMessages(conversationId);
    setHistoricalMessages(loadedMessages);
    
    const conversations = getConversations();
    const conversation = conversations.find((c) => c.id === conversationId);
    setIsFirstMessage(!conversation || conversation.messageCount === 0);
    
    // Load the conversation title
    if (conversation) {
      setConversationTitle(conversation.title);
    } else {
      setConversationTitle('');
    }
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historicalMessages]);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;

    // Optimistically set the title for the first message
    if (isFirstMessage) {
      const newTitle = generateTitle(value);
      setConversationTitle(newTitle);
      
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
        saveConversation(optimisticConversation);
        
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
  // Combine historical messages with live chat messages
  const allMessages = [
    // Historical messages from storage
    ...historicalMessages.map((msg) => ({
      key: msg.id,
      loading: false,
      role: msg.role,
      content: msg.content,
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
      {/* Header */}
      <div
        style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: '24px' }}>
          {conversationTitle || 'New chat'}
        </h2>
      </div>

      {/* Messages Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isFirstMessage && historicalMessages.length === 0 && messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px',
              gap: 48,
            }}
          >
            <div style={{ maxWidth: 900 }}>
                <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 16 }}>
                Say hi to Volt
                </h1>
              <p style={{ fontSize: 16, color: '#666', marginBottom: 48 }}>
                I&apos;m here to help you analyse pricing, profitability, and identify opportunities
                in your sales data. Ask me anything about margins, customer performance, or
                product pricing.
              </p>

              {/* Centered Input */}
              <div style={{ marginBottom: 32 }}>
                <Sender
                  value={content}
                  onChange={setContent}
                  onSubmit={handleSubmit}
                  placeholder="Press Shift + Enter to send message"
                  loading={agent.isRequesting()}
                  style={{
                    maxWidth: 900,
                    margin: '0 auto',
                  }}
                />
              </div>

              {/* Horizontal Scrollable Suggestions */}
              <div
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  display: 'flex',
                  gap: 12,
                  paddingBottom: 8,
                  scrollbarWidth: 'thin',
                }}
              >
                {[
                  
                  'What was the margin trend for 2024?',
                  'How did discount % affect sales volume?',
                  'At what price should the customer Gripz Isla Ltd (Belfast) charge for the product IEZ27ITY7949?',
                  'What are the top 10 products by margin?',
                  'Identify products with pricing inconsistency in 2023',
                  
                ].map((suggestion) => (
                  <div
                    key={suggestion}
                    onClick={() => handleSubmit(suggestion)}
                    style={{
                      padding: '10px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 20,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      fontSize: 14,
                      color: '#262626',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1677ff';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 119, 255, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {bubbleItems.length > 0 && (
          <Bubble.List
            roles={roles}
            items={bubbleItems.map((item) => ({
              ...item,
              content: (
                <MessageBubble
                  content={item.content as string}
                  role={item.role}
                  loading={item.loading}
                  typing={item.role === 'assistant' && item.loading}
                />
              ),
            }))}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Only shown when there are messages */}
      {bubbleItems.length > 0 && (
        <div
          style={{
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            padding: '16px 24px',
          }}
        >
          <Sender
            value={content}
            onChange={setContent}
            onSubmit={handleSubmit}
            placeholder="Ask about pricing, margins, or profitability..."
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

