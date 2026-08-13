import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { NextjsStatusService } from './probe/nextjs-status.service';

const proxy = createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
});

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  constructor(private readonly statusService: NextjsStatusService) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (this.statusService.isAvailable()) {
      // Next.js is available, proxy the request
      proxy(req, res, next);
    } else {
      // Next.js is not available, fall through to mock controllers
      next();
    }
  }
}
