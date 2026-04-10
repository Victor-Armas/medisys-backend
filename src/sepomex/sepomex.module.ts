import { Module } from '@nestjs/common';
import { SepomexController } from './sepomex.controller';
import { SepomexService } from './sepomex.service';

@Module({
  controllers: [SepomexController],
  providers: [SepomexService],
  exports: [SepomexService],
})
export class SepomexModule {}
