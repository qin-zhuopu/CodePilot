import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ProxyMiddleware } from './proxy.middleware';

/**
 * Root application module for the API gateway.
 *
 * Production deployment notes:
 * - Add @nestjs/serve-static (ServeStaticModule) to serve the built Vite assets
 *   from apps/web/dist, so the gateway becomes the single entry point for both
 *   static files and API routes.
 * - Alternatively, place a reverse proxy (nginx/caddy) in front that routes
 *   /api/* to this gateway and serves static assets directly.
 */
@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ProxyMiddleware).forRoutes('api');
  }
}
