import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool-call';
  content: string;
  timestamp: number;
  toolCall?: ToolCallData;
}

export interface ToolCallData {
  toolName: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown> | Array<unknown>;
  status: 'pending' | 'complete';
}

export interface StreamEvent {
  type: 'tool-call' | 'tool-result' | 'text-delta' | 'error';
  data: Record<string, unknown>;
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

/**
 * Hook to fetch conversations with automatic refetching
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    staleTime: 0, // Always consider stale to refetch on focus
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

/**
 * Hook to delete a conversation with cache invalidation
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversationId: string) => {
      deleteConversation(conversationId);
      return Promise.resolve();
    },
    onSuccess: () => {
      // Invalidate and refetch conversations
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Failed to delete conversation:', error);
    },
  });
}

/**
 * Hook to fetch messages for a specific conversation
 */
export function useConversationMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => getConversationMessages(conversationId),
    staleTime: 0,
  });
}

/**
 * Hook to save a conversation with cache invalidation and optimistic updates
 */
export function useSaveConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversation: Conversation) => {
      saveConversation(conversation);
      return Promise.resolve(conversation);
    },
    onMutate: async (newConversation) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      await queryClient.cancelQueries({ queryKey: ['messages', newConversation.id] });
      await queryClient.cancelQueries({ queryKey: ['conversation', newConversation.id] });

      // Snapshot the previous values
      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations']);
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['messages', newConversation.id]);
      const previousConversation = queryClient.getQueryData<Conversation>(['conversation', newConversation.id]);

      // Optimistically update conversations list
      queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) => {
        const index = old.findIndex(c => c.id === newConversation.id);
        if (index >= 0) {
          const updated = [...old];
          updated[index] = newConversation;
          return updated;
        }
        return [newConversation, ...old];
      });

      // Optimistically update messages
      if (newConversation.messages) {
        queryClient.setQueryData(['messages', newConversation.id], newConversation.messages);
      }

      // Optimistically update single conversation
      queryClient.setQueryData(['conversation', newConversation.id], newConversation);

      // Return context with previous values
      return { previousConversations, previousMessages, previousConversation };
    },
    onError: (_error, newConversation, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', newConversation.id], context.previousMessages);
      }
      if (context?.previousConversation) {
        queryClient.setQueryData(['conversation', newConversation.id], context.previousConversation);
      }
    },
    onSettled: (conversation) => {
      // Refetch to ensure data is in sync with storage
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (conversation) {
        queryClient.invalidateQueries({ queryKey: ['messages', conversation.id] });
        queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
      }
    },
  });
}

/**
 * Hook to fetch a single conversation
 */
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => {
      const conversations = getConversations();
      return conversations.find(c => c.id === conversationId) ?? null;
    },
    enabled: !!conversationId, // Only run query if conversationId exists
  });
}

/**
 * Hook to update conversation title with cache invalidation and optimistic updates
 */
export function useUpdateConversationTitle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) => {
      updateConversationTitle(conversationId, title);
      return Promise.resolve({ conversationId, title });
    },
    onMutate: async ({ conversationId, title }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['conversations'] });
      await queryClient.cancelQueries({ queryKey: ['conversation', conversationId] });

      // Snapshot the previous values
      const previousConversations = queryClient.getQueryData<Conversation[]>(['conversations']);
      const previousConversation = queryClient.getQueryData<Conversation>(['conversation', conversationId]);

      // Optimistically update conversations list
      queryClient.setQueryData<Conversation[]>(['conversations'], (old = []) => {
        return old.map(c => c.id === conversationId ? { ...c, title } : c);
      });

      // Optimistically update single conversation
      queryClient.setQueryData<Conversation>(['conversation', conversationId], (old) => {
        return old ? { ...old, title } : old;
      });

      // Return context with previous values
      return { previousConversations, previousConversation };
    },
    onError: (_error, { conversationId }, context) => {
      // Rollback on error
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations);
      }
      if (context?.previousConversation) {
        queryClient.setQueryData(['conversation', conversationId], context.previousConversation);
      }
    },
    onSettled: (_data, _error, { conversationId }) => {
      // Refetch to ensure data is in sync with storage
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
  });
}

