import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { useChatSession } from '@/hooks/useChatSession';
import type { ChatSession } from '@/types';

/**
 * ChatSessionPage - Existing session page (route: /chat/:id)
 * Loads session info and messages, allows follow-up messages with SSE streaming.
 */
export function ChatSessionPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  const { messages, setMessages, streamingContent, isStreaming, sendMessage, stop } =
    useChatSession();

  // Fetch session info and messages
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    async function loadSession() {
      try {
        const [sessionRes, messagesRes] = await Promise.all([
          fetch(`/api/chat/sessions/${id}`),
          fetch(`/api/chat/messages/${id}`),
        ]);

        if (cancelled) return;

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setSession(sessionData);
        }

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData);
        }
      } catch {
        // Failed to load session
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [id, setMessages]);

  const handleSend = useCallback(
    (content: string) => {
      if (!id) return;
      sendMessage(content, id, session?.model);
    },
    [id, session?.model, sendMessage],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Session header */}
      {session && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {session.title || 'Chat'}
          </h2>
        </div>
      )}

      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
      />
      <MessageInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
