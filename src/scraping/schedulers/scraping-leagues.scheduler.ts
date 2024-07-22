import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JOB, QUEUE } from '../../queue';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScrapingLeaguesScheduler implements OnModuleInit {
  private readonly logger = new Logger(ScrapingLeaguesScheduler.name);

  constructor(
    @InjectQueue(QUEUE.SCRAPING_LEAGUES) private readonly leaguesQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cleanAllQueues();
    this.logger.debug(`Leagues queue cleared`);

    this.logger.debug('Initializing scraping leagues job at startup');
    await this.scrapeLeagues();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    this.logger.debug('Initializing scraping leagues job with cron');
    await this.scrapeLeagues();
  }

  private async scrapeLeagues(): Promise<void> {
    const job = await this.leaguesQueue.add(JOB.SCRAPE_LEAGUES, {});
    this.logger.debug(`Job added with ID: ${job.id}`);
  }

  async cleanAllQueues() {
    await Promise.all([
      this.leaguesQueue.clean(0, 'completed'),
      this.leaguesQueue.clean(0, 'wait'),
      this.leaguesQueue.clean(0, 'active'),
      this.leaguesQueue.clean(0, 'delayed'),
      this.leaguesQueue.clean(0, 'failed'),
    ]);

    this.logger.debug('All queues have been cleaned');
  }
}
