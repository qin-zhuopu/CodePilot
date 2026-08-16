import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { NextjsStatusService } from './probe/nextjs-status.service';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private proxy;

  constructor(private readonly statusService: NextjsStatusService) {
    this.proxy = createProxyMiddleware({
      target: 'http://localhost:3000',
      changeOrigin: true,
      on: {
        error: (err, req, res) => {
          // Next.js is unreachable; revert to mock mode automatically
          this.statusService.markUnavailable();
          // If the response hasn't been sent yet, respond with 502
          if (res && 'headersSent' in res && !(res as Response).headersSent) {
            (res as Response).status(502).json({
              error: 'Next.js became unavailable, reverting to mock mode',
            });
          }
        },
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Always handle management routes (_probe, _status) locally
    if (req.path.startsWith('/api/_') || req.path.startsWith('/_')) {
      return next();
    }

    if (this.statusService.isAvailable()) {
      // Next.js is available, proxy the request
      this.proxy(req, res, next);
    } else {
      // Next.js is not available, fall through to mock controllers
      next();
    }
  }
}
