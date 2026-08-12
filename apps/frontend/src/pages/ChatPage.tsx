import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { useChatSession } from '@/hooks/useChatSession';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * ChatPage - New chat page (route: /chat)
 * Shows a welcome message and input. On send, creates a new session
 * and starts streaming the assistant response via SSE.
 */
export function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { messages, setMessages, streamingContent, isStreaming, sendMessage, stop } =
    useChatSession({
      onStreamComplete: (sessionId) => {
        if (sessionId) {
          navigate(`/chat/${sessionId}`, { replace: true });
        }
      },
    });

  const handleSend = useCallback(
    async (content: string) => {
      try {
        // Create a new session without sending the message content for processing.
        // The session creation endpoint only allocates a session ID.
        // The actual message is sent exclusively via the SSE stream below,
        // avoiding the duplicate-message problem of sending content in both requests.
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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

        // Send the message via SSE stream (single path for message processing)
        sendMessage(content, session.id);
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
    [sendMessage, setMessages],
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
