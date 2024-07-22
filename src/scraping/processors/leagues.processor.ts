import {
  Processor,
  Process,
  OnQueueCompleted,
  InjectQueue,
} from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ScrapingLeaguesService } from '../services';
import { JOB, QUEUE } from '../../queue';
import { RpcException } from '@nestjs/microservices';

@Injectable()
@Processor(QUEUE.SCRAPING_LEAGUES)
export class LeaguesProcessor {
  private readonly logger = new Logger(LeaguesProcessor.name);

  constructor(
    private readonly scrapingLeaguesService: ScrapingLeaguesService,
    @InjectQueue(QUEUE.SCRAPING_TEAMS) private readonly teamsQueue: Queue,
  ) {}

  @Process({
    concurrency: 1,
    name: JOB.SCRAPE_LEAGUES,
  })
  async handleLeagues(job: Job) {
    const startTime = Date.now();

    this.logger.debug(
      `Processing job ID: ${job.id} - Data: ${JSON.stringify(job.data)} at ${new Date(startTime).toISOString()}`,
    );

    try {
      await this.scrapingLeaguesService.scrapeLeagues();

      this.logger.debug(
        `Scrape leagues completed for job ID: ${job.id} at ${new Date().toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} to scrape leagues`,
        error,
      );
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error processing job to scrape leagues',
      });
    } finally {
      const endTime = Date.now();
      this.logger.debug(
        `Finished processing job ID: ${job.id} - Duration: ${(endTime - startTime) / 1000}s`,
      );
    }
  }

  @OnQueueCompleted()
  async handleQueueCompleted(job: Job): Promise<void> {
    this.logger.debug(`Leagues job with ID ${job.id} completed`);
    await this.scrapeTeams();
  }

  private async scrapeTeams(): Promise<void> {
    const job = await this.teamsQueue.add(JOB.SCRAPE_TEAMS, {});
    this.logger.debug(`Teams job added with ID: ${job.id}`);
  }
}
