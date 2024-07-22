import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JOB, QUEUE } from '../../queue';
import { LiveMatchesProcessor } from '../processors';

@Injectable()
export class ScrapingLiveMatchesScheduler implements OnModuleInit {
  private readonly logger = new Logger(ScrapingLiveMatchesScheduler.name);

  constructor(
    @InjectQueue(QUEUE.SCRAPING_LIVE_MATCHES)
    private readonly liveMatchesQueue: Queue,
    private liveMatchesProcessor: LiveMatchesProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cleanAllQueues();
    this.logger.debug(`Live matches queue cleared`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    this.logger.debug('Initializing scraping live matches job with cron');
    await this.scrapeLiveMatches();
  }

  private async scrapeLiveMatches(): Promise<void> {
    const job = await this.liveMatchesQueue.add(JOB.SCRAPE_LIVE_MATCHES, {});
    this.logger.debug(`Job added with ID: ${job.id}`);
  }

  async cleanAllQueues() {
    await Promise.all([
      this.liveMatchesQueue.clean(0, 'completed'),
      this.liveMatchesQueue.clean(0, 'wait'),
      this.liveMatchesQueue.clean(0, 'active'),
      this.liveMatchesQueue.clean(0, 'delayed'),
      this.liveMatchesQueue.clean(0, 'failed'),
    ]);

    this.logger.debug('All queues have been cleaned');
  }
}
