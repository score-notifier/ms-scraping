import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapingLeaguesService } from '../services';

@Injectable()
export class ScrapingLeaguesScheduler implements OnModuleInit {
  constructor(
    private readonly scrapingLeaguesService: ScrapingLeaguesService,
  ) {}

  async onModuleInit() {
    // await this.scrapingLeaguesService.scrapeLeagues();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    // await this.scrapingLeaguesService.scrapeLeagues();
  }
}
