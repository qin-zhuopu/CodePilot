import { Module } from '@nestjs/common';
import { MockChatController } from './mock-chat.controller';

@Module({
  controllers: [MockChatController],
})
export class MockChatModule {}
