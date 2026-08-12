import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useTranslation } from '@/hooks/useTranslation';
import type { ChatSession } from '@/types';

interface ChatSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function ChatSidebar({ collapsed, onToggle }: ChatSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: activeId } = useParams<{ id: string }>();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch {
      // Silently fail - will show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleNewChat = useCallback(() => {
    navigate('/chat');
  }, [navigate]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      navigate(`/chat/${sessionId}`);
    },
    [navigate],
  );

  if (collapsed) {
    return (
      <div className="flex h-full w-12 flex-col items-center border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 py-3">
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="Expand sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-3 py-3">
        <Button variant="default" size="sm" onClick={handleNewChat} className="flex-1">
          {t('chatList.newConversation')}
        </Button>
        <button
          onClick={onToggle}
          className="ml-2 rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800"
          aria-label="Collapse sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* Session list */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            {t('chatList.noSessions')}
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left transition-colors',
                  'hover:bg-gray-200 dark:hover:bg-gray-800',
                  activeId === session.id &&
                    'bg-gray-200 dark:bg-gray-800 font-medium',
                )}
              >
                <div className="truncate text-sm text-gray-900 dark:text-gray-100">
                  {session.title || 'Untitled'}
                </div>
                <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {formatRelativeTime(session.updated_at)}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}
