import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProxyMiddleware } from './proxy.middleware';
import { ProbeModule } from './probe/probe.module';
import { MockChatModule } from './mock/mock-chat.module';

@Module({
  imports: [ProbeModule, MockChatModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProxyMiddleware).forRoutes('api');
  }
}
