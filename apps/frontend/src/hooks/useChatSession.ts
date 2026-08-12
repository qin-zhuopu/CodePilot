import { useCallback, useRef, useState } from 'react';
import { useSSEStream } from '@/hooks/useSSEStream';
import type { Message, TokenUsage } from '@/types';

export interface UseChatSessionOptions {
  /** Called when the assistant response stream finishes */
  onStreamComplete?: (sessionId: string | null) => void;
}

export interface UseChatSessionReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  streamingContent: string;
  isStreaming: boolean;
  sendMessage: (content: string, sessionId: string, model?: string) => void;
  stop: () => void;
}

/**
 * Shared chat session logic extracted from ChatPage and ChatSessionPage.
 * Manages messages state, SSE streaming, and the send flow.
 */
export function useChatSession(options: UseChatSessionOptions = {}): UseChatSessionReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const streamingRef = useRef('');
  const sessionIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { start, stop, isStreaming } = useSSEStream({
    onStart: () => {
      streamingRef.current = '';
      setStreamingContent('');
    },
    onText: (content) => {
      streamingRef.current += content;
      setStreamingContent(streamingRef.current);
    },
    onResult: (usage: TokenUsage) => {
      const finalContent = streamingRef.current;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          created_at: new Date().toISOString(),
          token_usage: usage,
        },
      ]);
      streamingRef.current = '';
      setStreamingContent('');
      optionsRef.current.onStreamComplete?.(sessionIdRef.current);
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

  const sendMessage = useCallback(
    (content: string, sessionId: string, model?: string) => {
      sessionIdRef.current = sessionId;

      // Add optimistic user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Start SSE stream
      start('/api/chat/messages', {
        sessionId,
        content,
        model: model || 'claude-sonnet-4-20250514',
        providerId: 'default',
      });
    },
    [start],
  );

  return {
    messages,
    setMessages,
    streamingContent,
    isStreaming,
    sendMessage,
    stop,
  };
}
