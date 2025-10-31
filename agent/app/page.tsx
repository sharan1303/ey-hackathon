'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ConversationSidebar } from './components/conversation-sidebar';
import { ChatInterface } from './components/chat-interface';
import { generateConversationId, type Conversation } from './lib/chat-api';

// Dynamically import DatabaseLoader with ssr: false to prevent sql.js from being bundled during SSR
const DatabaseLoader = dynamic(
  () => import('./components/database-loader').then((mod) => ({ default: mod.DatabaseLoader })),
  { ssr: false }
);

export default function Home() {
  const [currentConversationId, setCurrentConversationId] = useState<string>(() =>
    generateConversationId()
  );
  const [sidebarKey, setSidebarKey] = useState(0);

  const handleNewConversation = () => {
    const newId = generateConversationId();
    setCurrentConversationId(newId);
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleConversationUpdate = (conversation: Conversation) => {
    // Refresh sidebar to show updated conversation
    setSidebarKey((prev) => prev + 1);
  };

  return (
    <DatabaseLoader>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <ConversationSidebar
          key={sidebarKey}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface
            key={currentConversationId}
            conversationId={currentConversationId}
            onConversationUpdate={handleConversationUpdate}
          />
        </div>
      </div>
    </DatabaseLoader>
  );
}
