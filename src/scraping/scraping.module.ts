import { Module } from '@nestjs/common';
import { NatsModule } from 'src/transports/nats.module';
import { ScheduleModule } from '@nestjs/schedule';

import {
  ScrapingLeaguesScheduler,
  ScrapingMatchesScheduler,
  ScrapingTeamsScheduler,
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

@Module({
  providers: [
    ScrapingService,
    ScrapingLeaguesService,
    ScrapingMatchesService,
    ScrapingTeamsService,
    ScrapingTeamStatsService,
    ScrapingLiveMatchesService,
    ScrapingTeamsScheduler,
    ScrapingMatchesScheduler,
    ScrapingLeaguesScheduler,
    ScrapingTeamStatsScheduler,
    ScrapingLiveMatchesScheduler,
  ],
  imports: [NatsModule, ScheduleModule.forRoot()],
})
export class ScrapingModule {}
