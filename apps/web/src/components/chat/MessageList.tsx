import { useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { MessageItem } from './MessageItem';
import type { Message } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';

interface MessageListProps {
  messages: Message[];
  streamingContent?: string;
  isStreaming?: boolean;
}

export function MessageList({ messages, streamingContent, isStreaming }: MessageListProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-400 dark:text-gray-500">
          {t('chat.newChat.welcome')}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {/* Streaming partial message */}
        {isStreaming && streamingContent && (
          <MessageItem
            message={{
              id: '__streaming__',
              role: 'assistant',
              content: streamingContent,
              created_at: new Date().toISOString(),
            }}
            isStreaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
