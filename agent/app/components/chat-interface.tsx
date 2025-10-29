'use client';

import { useState, useEffect, useRef } from 'react';
import { Bubble, Sender, useXAgent, useXChat } from '@ant-design/x';
import type { GetProp } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
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
  assistant: {
    placement: 'start',
    avatar: { icon: <RobotOutlined />, style: { background: '#f0f0f0', color: '#1677ff' } },
  },
  user: {
    placement: 'end',
    avatar: { icon: <UserOutlined />, style: { background: '#1677ff' } },
  },
};

export function ChatInterface({ conversationId, onConversationUpdate }: ChatInterfaceProps) {
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [historicalMessages, setHistoricalMessages] = useState<ChatMessage[]>([]);

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
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, historicalMessages]);

  const handleSubmit = (value: string) => {
    if (!value.trim()) return;

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
    // Live messages from current chat session
    ...messages.map(({ id, message, status }) => {
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
        background: '#f5f5f5',
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
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            Voltura Pricing Agent
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#999' }}>
            AI-powered pricing and profitability analysis
          </p>
        </div>
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
            }}
          >
            <RobotOutlined style={{ fontSize: 64, color: '#1677ff', marginBottom: 24 }} />
            <h1 style={{ fontSize: 32, fontWeight: 600, marginBottom: 16 }}>
              Welcome to Volt
            </h1>
            <p style={{ fontSize: 16, color: '#666', maxWidth: 600, marginBottom: 32 }}>
              I&apos;m here to help you analyze pricing, profitability, and identify opportunities
              in your sales data. Ask me anything about margins, customer performance, or
              product pricing.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: 16,
                maxWidth: 800,
                width: '100%',
              }}
            >
              {[
                'Which customers are losing money?',
                'Show me the executive dashboard',
                'What are our top performing products?',
                'Identify pricing issues in Q4 2024',
              ].map((suggestion) => (
                <div
                  key={suggestion}
                  onClick={() => handleSubmit(suggestion)}
                  style={{
                    padding: 16,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
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
                  <p style={{ margin: 0, fontSize: 14, color: '#262626' }}>{suggestion}</p>
                </div>
              ))}
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
            style={{ marginBottom: 24 }}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
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
    </div>
  );
}

