import { Global, Module } from '@nestjs/common';
import { ModuleFlagsService } from './module-flags.service';

@Global()
@Module({
  providers: [ModuleFlagsService],
  exports: [ModuleFlagsService],
})
export class ModuleFlagsModule {}
