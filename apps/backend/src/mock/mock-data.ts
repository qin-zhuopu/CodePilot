export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  model: string;
  working_directory: string;
  status: 'active' | 'archived';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  token_usage?: TokenUsage;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cost_usd?: number;
}

export const mockSessions: ChatSession[] = [
  {
    id: 'session-001',
    title: 'Getting Started with TypeScript',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    model: 'gpt-4',
    working_directory: '/projects/demo',
    status: 'active',
  },
  {
    id: 'session-002',
    title: 'React Component Architecture',
    created_at: '2024-01-14T14:00:00Z',
    updated_at: '2024-01-14T15:00:00Z',
    model: 'gpt-4',
    working_directory: '/projects/frontend',
    status: 'active',
  },
  {
    id: 'session-003',
    title: 'Database Schema Design',
    created_at: '2024-01-13T09:00:00Z',
    updated_at: '2024-01-13T09:45:00Z',
    model: 'gpt-3.5-turbo',
    working_directory: '/projects/backend',
    status: 'archived',
  },
];

export const mockMessages: Record<string, Message[]> = {
  'session-001': [
    {
      id: 'msg-001',
      role: 'user',
      content: 'How do I define a generic type in TypeScript?',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'msg-002',
      role: 'assistant',
      content:
        'In TypeScript, you can define a generic type using angle brackets. For example:\n\n```typescript\nfunction identity<T>(arg: T): T {\n  return arg;\n}\n```\n\nThis allows the function to work with any type while maintaining type safety.',
      created_at: '2024-01-15T10:00:05Z',
      token_usage: { input_tokens: 12, output_tokens: 45, cost_usd: 0.002 },
    },
  ],
  'session-002': [
    {
      id: 'msg-003',
      role: 'user',
      content: 'What is the best way to structure React components?',
      created_at: '2024-01-14T14:00:00Z',
    },
    {
      id: 'msg-004',
      role: 'assistant',
      content:
        'A good React component architecture follows these principles:\n\n1. **Single Responsibility**: Each component should do one thing well.\n2. **Composition over Inheritance**: Build complex UIs by composing smaller components.\n3. **Container/Presentational Pattern**: Separate data logic from UI rendering.',
      created_at: '2024-01-14T14:00:08Z',
      token_usage: { input_tokens: 10, output_tokens: 60, cost_usd: 0.003 },
    },
  ],
  'session-003': [
    {
      id: 'msg-005',
      role: 'user',
      content: 'How should I design a schema for a chat application?',
      created_at: '2024-01-13T09:00:00Z',
    },
    {
      id: 'msg-006',
      role: 'assistant',
      content:
        'For a chat application, consider these core tables:\n\n- **users**: id, name, email, created_at\n- **conversations**: id, title, created_at\n- **messages**: id, conversation_id, user_id, content, created_at\n- **participants**: conversation_id, user_id, joined_at',
      created_at: '2024-01-13T09:00:10Z',
      token_usage: { input_tokens: 11, output_tokens: 55, cost_usd: 0.0025 },
    },
  ],
};
