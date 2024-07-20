import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapingTeamsService } from '../services';

@Injectable()
export class ScrapingTeamsScheduler implements OnModuleInit {
  constructor(private readonly scrapingTeamsService: ScrapingTeamsService) {}

  async onModuleInit() {
    await this.scrapingTeamsService.scrapeTeams();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    // await this.scrapingTeamsService.scrapeTeams();
  }
}
