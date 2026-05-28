import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';
import { OpsDashboardController } from './ops-dashboard.controller';
import { PilotTelemetryModule } from '@/common/telemetry/pilot-telemetry.module';

@Module({
  imports: [TerminusModule, PilotTelemetryModule],
  controllers: [HealthController, MetricsController, OpsDashboardController],
})
export class HealthModule {}
