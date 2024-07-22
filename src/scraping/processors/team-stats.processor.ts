import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ScrapingTeamStatsService } from '../services';
import { JOB, QUEUE } from '../../queue';
import { RpcException } from '@nestjs/microservices';

@Injectable()
@Processor(QUEUE.SCRAPING_TEAMS_STATS)
export class TeamStatsProcessor {
  private readonly logger = new Logger(TeamStatsProcessor.name);

  constructor(
    private readonly scrapingTeamStatsService: ScrapingTeamStatsService,
  ) {}

  @Process({
    concurrency: 1,
    name: JOB.SCRAPE_TEAM_STATS,
  })
  async handleLiveMatches(job: Job) {
    const startTime = Date.now();

    this.logger.debug(
      `Processing job ID: ${job.id} - Data: ${JSON.stringify(job.data)} at ${new Date(startTime).toISOString()}`,
    );

    try {
      await this.scrapingTeamStatsService.scrapeTeamStats();

      this.logger.debug(
        `Scrape team stats completed for job ID: ${job.id} at ${new Date().toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} to scrape team stats`,
        error,
      );
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error processing job to scrape team stats',
      });
    } finally {
      const endTime = Date.now();
      this.logger.debug(
        `Finished processing job ID: ${job.id} - Duration: ${(endTime - startTime) / 1000}s`,
      );
    }
  }
}
