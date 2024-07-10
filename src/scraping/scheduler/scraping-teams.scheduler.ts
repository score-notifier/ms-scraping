import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapingService } from '../scraping.service';

@Injectable()
export class ScrapingScheduler implements OnModuleInit {
  constructor(private readonly scrapingService: ScrapingService) {}

  async onModuleInit() {
    await this.scrapingService.scrapeTeams();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    await this.scrapingService.scrapeTeams();
  }
}
