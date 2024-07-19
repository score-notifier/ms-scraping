import { Injectable, OnModuleInit } from '@nestjs/common';

import { ScrapingTeamStatsService } from '../scraping-team-stats.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScrapingTeamStatsScheduler implements OnModuleInit {
  constructor(
    private readonly scrapingTeamStatsService: ScrapingTeamStatsService,
  ) {}

  async onModuleInit() {
    await this.scrapingTeamStatsService.scrapeTeamStats();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    await this.scrapingTeamStatsService.scrapeTeamStats();
  }
}
