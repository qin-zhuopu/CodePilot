// ==========================================
// Chat Types for apps/web
// ==========================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  token_usage?: TokenUsage;
  attachments?: FileAttachment[];
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cost_usd?: number;
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  model: string;
  working_directory: string;
  status: 'active' | 'archived';
}

// ==========================================
// SSE Event Types (discriminated union)
// ==========================================

export type SSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'thinking_delta'; content: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'status'; text: string }
  | { type: 'result'; usage: TokenUsage }
  | { type: 'error'; message: string };
