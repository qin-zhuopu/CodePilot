import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { ChatSidebar } from '@/components/chat/ChatSidebar';

export function ChatLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleToggleMobile = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <ChatSidebar
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
        />
      </div>

      {/* Mobile sidebar toggle button */}
      <div className="md:hidden absolute top-3 left-3 z-50">
        <button
          onClick={handleToggleMobile}
          className="rounded-lg bg-white dark:bg-gray-900 p-2 shadow-md border border-gray-200 dark:border-gray-700"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={handleToggleMobile}
          />
          <div className="relative z-50 h-full">
            <ChatSidebar onToggle={handleToggleMobile} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
