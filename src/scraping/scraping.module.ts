import { Module } from '@nestjs/common';
import { NatsModule } from 'src/transports/nats.module';
import { ScheduleModule } from '@nestjs/schedule';

import {
  ScrapingLeaguesScheduler,
  ScrapingMatchesScheduler,
  ScrapingTeamStatsScheduler,
  ScrapingLiveMatchesScheduler,
} from './schedulers';

import {
  ScrapingService,
  ScrapingLiveMatchesService,
  ScrapingTeamStatsService,
  ScrapingTeamsService,
  ScrapingMatchesService,
  ScrapingLeaguesService,
} from './services';

import { LeaguesProcessor, TeamsProcessor } from './processors';
import { QueueModule } from '../queue/queue.module';

@Module({
  providers: [
    ScrapingService,
    ScrapingLeaguesService,
    ScrapingMatchesService,
    ScrapingTeamsService,
    ScrapingTeamStatsService,
    ScrapingLiveMatchesService,
    ScrapingMatchesScheduler,
    ScrapingLeaguesScheduler,
    ScrapingTeamStatsScheduler,
    ScrapingLiveMatchesScheduler,
    LeaguesProcessor,
    TeamsProcessor,
  ],
  imports: [NatsModule, QueueModule, ScheduleModule.forRoot()],
})
export class ScrapingModule {}
