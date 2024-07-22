import {
  Processor,
  Process,
  OnQueueCompleted,
  InjectQueue,
} from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ScrapingTeamsService } from '../services';
import { JOB, QUEUE } from '../../queue';
import { RpcException } from '@nestjs/microservices';

@Injectable()
@Processor(QUEUE.SCRAPING_TEAMS)
export class TeamsProcessor implements OnModuleInit {
  private readonly logger = new Logger(TeamsProcessor.name);

  constructor(
    private readonly scrapingTeamsService: ScrapingTeamsService,
    @InjectQueue(QUEUE.SCRAPING_TEAMS) private readonly teamsQueue: Queue,
    @InjectQueue(QUEUE.SCRAPING_TEAMS_STATS)
    private readonly teamStatsQueue: Queue,
    @InjectQueue(QUEUE.SCRAPING_MATCHES) private readonly matchesQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.cleanAllQueues();
    this.logger.debug(`All queues cleared`);
  }

  @Process({
    concurrency: 1,
    name: JOB.SCRAPE_TEAMS,
  })
  async handleTeams(job: Job) {
    const startTime = Date.now();
    try {
      this.logger.debug(
        `Processing job ID: ${job.id} - Data: ${JSON.stringify(job.data)} at ${new Date(startTime).toISOString()}`,
      );

      await this.scrapingTeamsService.scrapeTeams();

      this.logger.debug(
        `Scrape teams completed for job ID: ${job.id}, initiating job to scrape matches at ${new Date().toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} to scrape teams`,
        error,
      );
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error processing job to scrape teams',
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
    this.logger.debug(
      `Teams job with ID ${job.id} completed. Starting dependent jobs: Team Stats and Matches`,
    );

    await this.scrapeTeamStats();
    await this.scrapeMatches();
  }

  private async scrapeTeamStats(): Promise<void> {
    const job = await this.teamStatsQueue.add(JOB.SCRAPE_TEAM_STATS, {});
    this.logger.debug(`Team stats job added with ID: ${job.id}`);
  }

  private async scrapeMatches(): Promise<void> {
    const job = await this.matchesQueue.add(JOB.SCRAPE_MATCHES, {});
    this.logger.debug(`Matches job added with ID: ${job.id}`);
  }

  async cleanAllQueues() {
    await Promise.all([
      this.teamsQueue.clean(0, 'completed'),
      this.teamsQueue.clean(0, 'wait'),
      this.teamsQueue.clean(0, 'active'),
      this.teamsQueue.clean(0, 'delayed'),
      this.teamsQueue.clean(0, 'failed'),
      this.teamStatsQueue.clean(0, 'completed'),
      this.teamStatsQueue.clean(0, 'wait'),
      this.teamStatsQueue.clean(0, 'active'),
      this.teamStatsQueue.clean(0, 'delayed'),
      this.teamStatsQueue.clean(0, 'failed'),
      this.matchesQueue.clean(0, 'completed'),
      this.matchesQueue.clean(0, 'wait'),
      this.matchesQueue.clean(0, 'active'),
      this.matchesQueue.clean(0, 'delayed'),
      this.matchesQueue.clean(0, 'failed'),
    ]);

    this.logger.debug('All queues have been cleaned');
  }
}
