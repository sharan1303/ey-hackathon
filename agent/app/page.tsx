'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConversationSidebar } from './components/conversation-sidebar';
import { ChatInterface } from './components/chat-interface';
import { generateConversationId } from './lib/chat-api';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNewConversation = () => {
    const newId = generateConversationId();
    setCurrentConversationId(newId);
    // Close sidebar on mobile after selecting
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // Close sidebar on mobile after selecting
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleConversationUpdate = () => {
    // Refresh sidebar to show updated conversation
    setSidebarKey((prev) => prev + 1);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <DatabaseLoader>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <ConversationSidebar
          key={sidebarKey}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface
            key={currentConversationId}
            conversationId={currentConversationId}
            onConversationUpdate={handleConversationUpdate}
            isMobile={isMobile}
            onToggleSidebar={toggleSidebar}
          />
        </div>
      </div>
    </DatabaseLoader>
  );
}
