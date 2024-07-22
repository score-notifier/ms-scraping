import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ScrapingLiveMatchesService } from '../services';
import { JOB, QUEUE } from '../../queue';
import { RpcException } from '@nestjs/microservices';

@Injectable()
@Processor(QUEUE.SCRAPING_LIVE_MATCHES)
export class LiveMatchesProcessor {
  private readonly logger = new Logger(LiveMatchesProcessor.name);

  constructor(
    private readonly scrapingLiveMatchesService: ScrapingLiveMatchesService,
  ) {}

  @Process({
    concurrency: 1,
    name: JOB.SCRAPE_MATCHES,
  })
  async handleLiveMatches(job: Job) {
    const startTime = Date.now();

    this.logger.warn(
      `Processing job ID: ${job.id} - Data: ${JSON.stringify(job.data)} at ${new Date(startTime).toISOString()}`,
    );

    try {
      await this.scrapingLiveMatchesService.scrapeLiveMatches();

      this.logger.warn(
        `Scrape live matches completed for job ID: ${job.id} at ${new Date().toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} to scrape live matches`,
        error,
      );
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error processing job to scrape live matches',
      });
    } finally {
      const endTime = Date.now();
      this.logger.debug(
        `Finished processing job ID: ${job.id} - Duration: ${(endTime - startTime) / 1000}s`,
      );
    }
  }
}
