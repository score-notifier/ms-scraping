import { Module } from '@nestjs/common';
import { NatsModule } from 'src/transports/nats.module';
import { ScrapingService } from './scraping.service';
import { ScheduleModule } from '@nestjs/schedule';
import {
  ScrapingLeaguesScheduler,
  ScrapingMatchesScheduler,
  ScrapingTeamsScheduler,
  ScrapingTeamStatsScheduler,
} from './schedulers';
import { ScrapingMatchesService } from './scraping-matches.service';
import { ScrapingLeaguesService } from './scraping-leagues.service';
import { ScrapingTeamsService } from './scraping-teams.service';
import { ScrapingTeamStatsService } from './scraping-team-stats.service';

@Module({
  providers: [
    ScrapingService,
    ScrapingLeaguesService,
    ScrapingMatchesService,
    ScrapingTeamsService,
    ScrapingTeamStatsService,
    ScrapingTeamsScheduler,
    ScrapingMatchesScheduler,
    ScrapingLeaguesScheduler,
    ScrapingTeamStatsScheduler,
  ],
  imports: [NatsModule, ScheduleModule.forRoot()],
})
export class ScrapingModule {}
