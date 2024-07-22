import { Processor, Process, InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ScrapingTeamsService } from '../services';
import { JOB, QUEUE } from '../../queue';
import { RpcException } from '@nestjs/microservices';

@Injectable()
@Processor(QUEUE.SCRAPING_TEAMS)
export class TeamsProcessor {
  private readonly logger = new Logger(TeamsProcessor.name);

  constructor(
    private readonly scrapingTeamsService: ScrapingTeamsService,
    @InjectQueue(QUEUE.SCRAPING_MATCHES) private readonly matchesQueue: Queue,
  ) {}

  @Process({
    concurrency: 1,
    name: JOB.SCRAPE_TEAMS,
  })
  async handleTeams(job: Job) {
    const startTime = Date.now();

    this.logger.warn(
      `Processing job ID: ${job.id} - Data: ${JSON.stringify(job.data)} at ${new Date(startTime).toISOString()}`,
    );

    try {
      await this.scrapingTeamsService.scrapeTeams();

      this.logger.warn(
        `Scrape teams completed for job ID: ${job.id}, initiating job to scrape matches at ${new Date().toISOString()}`,
      );

      const teamsJob = await this.matchesQueue.add(JOB.SCRAPE_MATCHES, {});

      this.logger.debug(
        `New job to scrape matches added with ID: ${teamsJob.id}`,
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
}
