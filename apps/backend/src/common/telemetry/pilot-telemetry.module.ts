import { Module } from '@nestjs/common';
import { PilotTelemetryPersistenceService } from './pilot-telemetry-persistence.service';
import { PilotEvidenceService } from './pilot-evidence.service';

@Module({
  providers: [PilotTelemetryPersistenceService, PilotEvidenceService],
  exports: [PilotTelemetryPersistenceService, PilotEvidenceService],
})
export class PilotTelemetryModule {}
