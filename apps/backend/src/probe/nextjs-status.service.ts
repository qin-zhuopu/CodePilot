import { Injectable } from '@nestjs/common';
import * as http from 'http';

@Injectable()
export class NextjsStatusService {
  private available = false;
  private lastChecked: string | null = null;

  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Mark Next.js as unavailable. Called by the proxy error handler
   * to automatically revert to mock mode when Next.js goes down.
   */
  markUnavailable(): void {
    this.available = false;
    this.lastChecked = new Date().toISOString();
  }

  getStatus(): { available: boolean; lastChecked: string | null } {
    return {
      available: this.available,
      lastChecked: this.lastChecked,
    };
  }

  /**
   * Probe the Next.js health endpoint at localhost:3000/api/health.
   * Returns true if the service is reachable and responds with 2xx.
   */
  probe(): Promise<{ available: boolean; message: string }> {
    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/health',
          method: 'GET',
          timeout: 3000,
        },
        (res) => {
          this.lastChecked = new Date().toISOString();
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            this.available = true;
            resolve({
              available: true,
              message: 'Next.js service is available',
            });
          } else {
            this.available = false;
            resolve({
              available: false,
              message: `Next.js responded with status ${res.statusCode}`,
            });
          }
          // Consume response data to free up memory
          res.resume();
        },
      );

      req.on('error', (err) => {
        this.lastChecked = new Date().toISOString();
        this.available = false;
        resolve({
          available: false,
          message: `Next.js is not reachable: ${err.message}`,
        });
      });

      req.on('timeout', () => {
        this.lastChecked = new Date().toISOString();
        this.available = false;
        req.destroy();
        resolve({
          available: false,
          message: 'Next.js health check timed out',
        });
      });

      req.end();
    });
  }
}
