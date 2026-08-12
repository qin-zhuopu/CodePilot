import { useCallback, useRef, useState } from 'react';
import type { SSEEvent, TokenUsage } from '@/types';

export interface SSEStreamCallbacks {
  onStart?: () => void;
  onText?: (content: string) => void;
  onThinking?: (content: string) => void;
  onToolUse?: (data: { id: string; name: string; input: unknown }) => void;
  onToolResult?: (data: { tool_use_id: string; content: string; is_error?: boolean }) => void;
  onStatus?: (text: string) => void;
  onResult?: (usage: TokenUsage) => void;
  onError?: (message: string) => void;
}

interface UseSSEStreamReturn {
  start: (url: string, body: Record<string, unknown>) => void;
  stop: () => void;
  isStreaming: boolean;
}

/**
 * Hook for consuming Server-Sent Events via fetch + ReadableStream.
 * Parses the SSE wire format:
 *   event: <type>\ndata: <json>\n\n
 */
export function useSSEStream(callbacks: SSEStreamCallbacks): UseSSEStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const start = useCallback((url: string, body: Record<string, unknown>) => {
    // Abort any previous stream
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);
    callbacksRef.current.onStart?.();

    (async () => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          callbacksRef.current.onError?.(errorText || `HTTP ${response.status}`);
          setIsStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          callbacksRef.current.onError?.('No response body');
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr) as Record<string, unknown>;
                dispatchEvent(currentEvent, data, callbacksRef.current);
              } catch {
                // If data line is not JSON, try as plain text for text_delta
                if (currentEvent === 'text_delta') {
                  callbacksRef.current.onText?.(dataStr);
                }
              }
              currentEvent = '';
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Stream was intentionally stopped
        } else {
          const message = err instanceof Error ? err.message : 'Stream error';
          callbacksRef.current.onError?.(message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    })();
  }, []);

  return { start, stop, isStreaming };
}

function dispatchEvent(
  eventType: string,
  data: Record<string, unknown>,
  callbacks: SSEStreamCallbacks,
): void {
  const event = toSSEEvent(eventType, data);
  if (!event) return;

  switch (event.type) {
    case 'text_delta':
      callbacks.onText?.(event.content);
      break;
    case 'thinking_delta':
      callbacks.onThinking?.(event.content);
      break;
    case 'tool_use':
      callbacks.onToolUse?.({ id: event.id, name: event.name, input: event.input });
      break;
    case 'tool_result':
      callbacks.onToolResult?.({
        tool_use_id: event.tool_use_id,
        content: event.content,
        is_error: event.is_error,
      });
      break;
    case 'status':
      callbacks.onStatus?.(event.text);
      break;
    case 'result':
      callbacks.onResult?.(event.usage);
      break;
    case 'error':
      callbacks.onError?.(event.message);
      break;
  }
}

function toSSEEvent(
  eventType: string,
  data: Record<string, unknown>,
): SSEEvent | null {
  switch (eventType) {
    case 'text_delta':
      return { type: 'text_delta', content: String(data.content ?? '') };
    case 'thinking_delta':
      return { type: 'thinking_delta', content: String(data.content ?? '') };
    case 'tool_use':
      return {
        type: 'tool_use',
        id: String(data.id ?? ''),
        name: String(data.name ?? ''),
        input: data.input,
      };
    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: String(data.tool_use_id ?? ''),
        content: String(data.content ?? ''),
        is_error: data.is_error === true ? true : undefined,
      };
    case 'status':
      return { type: 'status', text: String(data.text ?? '') };
    case 'result':
      return {
        type: 'result',
        usage: data.usage as TokenUsage,
      };
    case 'error':
      return { type: 'error', message: String(data.message ?? 'Unknown error') };
    default:
      return null;
  }
}
