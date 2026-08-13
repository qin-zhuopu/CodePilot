import { Controller, Get, Post } from '@nestjs/common';
import { NextjsStatusService } from './nextjs-status.service';

@Controller('api')
export class ProbeController {
  constructor(private readonly statusService: NextjsStatusService) {}

  @Post('_probe')
  async probe() {
    const result = await this.statusService.probe();
    return result;
  }

  @Get('_status')
  getStatus() {
    return this.statusService.getStatus();
  }
}
