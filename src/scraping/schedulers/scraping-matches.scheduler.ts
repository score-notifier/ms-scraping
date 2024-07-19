import { Injectable, OnModuleInit } from '@nestjs/common';

import { ScrapingMatchesService } from '../scraping-matches.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScrapingMatchesScheduler implements OnModuleInit {
  constructor(
    private readonly scrapingMatchesService: ScrapingMatchesService,
  ) {}

  async onModuleInit() {
    // await this.scrapingMatchesService.scrapeMatches();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    await this.scrapingMatchesService.scrapeMatches();
  }
}
