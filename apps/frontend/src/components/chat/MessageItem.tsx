import { cn } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-600 text-white dark:bg-blue-500'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        )}
      >
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && message.role === 'assistant' && (
            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-current opacity-70" />
          )}
        </div>
        <div
          className={cn(
            'mt-1 text-xs',
            isUser
              ? 'text-blue-200 dark:text-blue-300'
              : 'text-gray-400 dark:text-gray-500',
          )}
        >
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
