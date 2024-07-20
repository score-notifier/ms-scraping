import { Injectable, OnModuleInit } from '@nestjs/common';

import { Interval } from '@nestjs/schedule';
import { ScrapingLiveMatchesService } from '../services';

@Injectable()
export class ScrapingLiveMatchesScheduler implements OnModuleInit {
  constructor(
    private readonly scrapingLiveMatchesService: ScrapingLiveMatchesService,
  ) {}

  async onModuleInit() {
    // await this.scrapingLiveMatchesService.scrapeLiveMatches();
  }

  @Interval(60 * 1000) // 1 minute
  async handleCron() {
    // await this.scrapingLiveMatchesService.scrapeLiveMatches();
  }
}
