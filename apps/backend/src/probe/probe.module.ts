import { Module } from '@nestjs/common';
import { NextjsStatusService } from './nextjs-status.service';
import { ProbeController } from './probe.controller';

@Module({
  controllers: [ProbeController],
  providers: [NextjsStatusService],
  exports: [NextjsStatusService],
})
export class ProbeModule {}
