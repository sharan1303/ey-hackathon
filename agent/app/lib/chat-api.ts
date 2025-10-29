import { useMutation } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
  messageCount: number;
  messages?: ChatMessage[];
}

export interface SendMessageParams {
  message: string;
  threadId: string;
  onChunk?: (chunk: string) => void;
}

/**
 * Sends a message to the chat API and handles streaming response
 */
export async function sendMessage({ message, threadId, onChunk }: SendMessageParams): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, threadId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
    throw new Error(error.error || 'Failed to send message');
  }

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
      
      if (onChunk) {
        onChunk(fullContent);
      }
    }

    return fullContent;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Hook for sending messages with streaming
 */
export function useSendMessage() {
  return useMutation({
    mutationFn: sendMessage,
    onError: (error) => {
      console.error('Failed to send message:', error);
    },
  });
}

/**
 * Local storage utilities for conversation management
 */
const CONVERSATIONS_KEY = 'voltura_conversations';

export function getConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CONVERSATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveConversation(conversation: Conversation): void {
  if (typeof window === 'undefined') return;
  
  try {
    const conversations = getConversations();
    const index = conversations.findIndex(c => c.id === conversation.id);
    
    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.unshift(conversation);
    }
    
    // Keep only last 50 conversations
    const trimmed = conversations.slice(0, 50);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save conversation:', error);
  }
}

export function deleteConversation(conversationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const conversations = getConversations();
    const filtered = conversations.filter(c => c.id !== conversationId);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete conversation:', error);
  }
}

export function updateConversationTitle(conversationId: string, title: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const conversations = getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.title = title;
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    }
  } catch (error) {
    console.error('Failed to update conversation title:', error);
  }
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get messages for a specific conversation
 */
export function getConversationMessages(conversationId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const conversations = getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    return conversation?.messages || [];
  } catch {
    return [];
  }
}

/**
 * Save messages for a specific conversation
 */
export function saveConversationMessages(conversationId: string, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    const conversations = getConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (conversation) {
      conversation.messages = messages;
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    }
  } catch (error) {
    console.error('Failed to save conversation messages:', error);
  }
}

