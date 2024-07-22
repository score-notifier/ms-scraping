import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ScrapingMatchesService } from '../services';
import { JOB, QUEUE } from '../../queue';
import { RpcException } from '@nestjs/microservices';

@Injectable()
@Processor(QUEUE.SCRAPING_MATCHES)
export class MatchesProcessor {
  private readonly logger = new Logger(MatchesProcessor.name);

  constructor(
    private readonly scrapingMatchesService: ScrapingMatchesService,
  ) {}

  @Process({
    concurrency: 1,
    name: JOB.SCRAPE_MATCHES,
  })
  async handleMatches(job: Job) {
    const startTime = Date.now();

    this.logger.debug(
      `Processing job ID: ${job.id} - Data: ${JSON.stringify(job.data)} at ${new Date(startTime).toISOString()}`,
    );

    try {
      await this.scrapingMatchesService.scrapeMatches();

      this.logger.debug(
        `Scrape matches completed for job ID: ${job.id} at ${new Date().toISOString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} to scrape matches`,
        error,
      );
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error processing job to scrape matches',
      });
    } finally {
      const endTime = Date.now();
      this.logger.debug(
        `Finished processing job ID: ${job.id} - Duration: ${(endTime - startTime) / 1000}s`,
      );
    }
  }
}
