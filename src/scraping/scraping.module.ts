import { Module } from '@nestjs/common';
import { NatsModule } from 'src/transports/nats.module';
import { ScrapingController } from './scraping.controller';
import { ScrapingService } from './scraping.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ScrapingScheduler } from './scheduler';

@Module({
  controllers: [ScrapingController],
  providers: [ScrapingService, ScrapingScheduler],
  imports: [NatsModule, ScheduleModule.forRoot()],
})
export class ScrapingModule {}
