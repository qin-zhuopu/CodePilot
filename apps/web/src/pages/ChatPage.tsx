import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { useSSEStream } from '@/hooks/useSSEStream';
import { useTranslation } from '@/hooks/useTranslation';
import type { Message } from '@/types';

/**
 * ChatPage - New chat page (route: /chat)
 * Shows a welcome message and input. On send, creates a new session
 * and starts streaming the assistant response via SSE.
 */
export function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const sessionIdRef = useRef<string | null>(null);
  const streamingRef = useRef('');

  const { start, stop, isStreaming } = useSSEStream({
    onStart: () => {
      streamingRef.current = '';
      setStreamingContent('');
    },
    onText: (content) => {
      streamingRef.current += content;
      setStreamingContent(streamingRef.current);
    },
    onResult: () => {
      // Streaming complete - add the assistant message
      const finalContent = streamingRef.current;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          created_at: new Date().toISOString(),
        },
      ]);
      streamingRef.current = '';
      setStreamingContent('');
      // Navigate to the session page
      if (sessionIdRef.current) {
        navigate(`/chat/${sessionIdRef.current}`, { replace: true });
      }
    },
    onError: (message) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${message}`,
          created_at: new Date().toISOString(),
        },
      ]);
      streamingRef.current = '';
      setStreamingContent('');
    },
  });

  const handleSend = useCallback(
    async (content: string) => {
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        // Create a new session
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            model: 'claude-sonnet-4-20250514',
            providerId: 'default',
            workingDirectory: '',
            mode: 'normal',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.status}`);
        }

        const session = await response.json();
        sessionIdRef.current = session.id;

        // Start SSE stream for messages
        start('/api/chat/messages', {
          sessionId: session.id,
          content,
          model: 'claude-sonnet-4-20250514',
          providerId: 'default',
        });
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${errorMessage}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    },
    [start],
  );

  const showWelcome = messages.length === 0 && !isStreaming;

  return (
    <div className="flex h-full flex-col">
      {showWelcome ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              {t('chat.newChat.welcome')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Start a conversation with your AI coding assistant.
            </p>
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
        />
      )}
      <MessageInput
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
