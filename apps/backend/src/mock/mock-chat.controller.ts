import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { mockSessions, mockMessages, ChatSession, Message } from './mock-data';

@Controller('api/chat')
export class MockChatController {
  private sessions: ChatSession[] = [...mockSessions];
  private messages: Record<string, Message[]> = JSON.parse(
    JSON.stringify(mockMessages),
  );

  @Get('sessions')
  getSessions() {
    return this.sessions;
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) {
      return { error: 'Session not found' };
    }
    return session;
  }

  @Get('messages/:id')
  getMessages(@Param('id') id: string) {
    return this.messages[id] || [];
  }

  @Post()
  createSession(@Body() body: { title?: string; model?: string }) {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: `session-${Date.now()}`,
      title: body.title || 'New Chat',
      created_at: now,
      updated_at: now,
      model: body.model || 'gpt-4',
      working_directory: '/projects',
      status: 'active',
    };
    this.sessions.unshift(session);
    this.messages[session.id] = [];
    return session;
  }

  @Post('messages')
  async sendMessage(
    @Body() body: { session_id: string; content: string },
    @Res() res: Response,
  ) {
    const { session_id, content } = body;

    // Store user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    if (!this.messages[session_id]) {
      this.messages[session_id] = [];
    }
    this.messages[session_id].push(userMessage);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Simulate streaming AI response
    const mockReply = this.generateMockReply(content);
    const chunks = this.splitIntoChunks(mockReply, 3);

    // Send status event
    res.write(
      `event: status\ndata: ${JSON.stringify({ text: 'Thinking...' })}\n\n`,
    );

    // Stream text_delta events
    let totalOutputTokens = 0;
    for (let i = 0; i < chunks.length; i++) {
      await this.delay(100 + Math.random() * 200);
      const chunk = chunks[i];
      totalOutputTokens += chunk.split(' ').length;
      res.write(
        `event: text_delta\ndata: ${JSON.stringify({ content: chunk })}\n\n`,
      );
    }

    // Store assistant message
    const assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: mockReply,
      created_at: new Date().toISOString(),
      token_usage: {
        input_tokens: content.split(' ').length * 2,
        output_tokens: totalOutputTokens,
        cost_usd: 0.003,
      },
    };
    this.messages[session_id].push(assistantMessage);

    // Send result event
    res.write(
      `event: result\ndata: ${JSON.stringify({
        usage: {
          input_tokens: content.split(' ').length * 2,
          output_tokens: totalOutputTokens,
        },
      })}\n\n`,
    );

    res.end();
  }

  private generateMockReply(userContent: string): string {
    const replies = [
      `That's a great question! Based on your input about "${userContent.slice(0, 30)}...", here's what I think:\n\nThe key points to consider are:\n1. Start with a clear understanding of the problem\n2. Break it down into smaller, manageable pieces\n3. Implement and test incrementally\n\nWould you like me to elaborate on any of these points?`,
      `I understand you're asking about "${userContent.slice(0, 30)}...". Let me help with that.\n\nHere's a practical approach:\n- First, define your requirements clearly\n- Then, design your solution architecture\n- Finally, implement with proper error handling\n\nLet me know if you need more specific guidance!`,
      `Great question! Regarding "${userContent.slice(0, 30)}...", here's my recommendation:\n\nThe best practice is to follow a structured approach:\n1. Research existing solutions\n2. Prototype your idea\n3. Iterate based on feedback\n\nIs there a specific aspect you'd like to dive deeper into?`,
    ];

    return replies[Math.floor(Math.random() * replies.length)];
  }

  private splitIntoChunks(text: string, wordsPerChunk: number): string[] {
    const words = text.split(' ');
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      chunks.push(i === 0 ? chunk : ' ' + chunk);
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
