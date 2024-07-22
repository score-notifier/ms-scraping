import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { envs } from 'src/config';
import { QUEUE } from './constants';

@Module({
  imports: [
    BullModule.forRoot({
      limiter: {
        max: 10, // Max number of jobs processed
        duration: 1000, // per duration in milliseconds
      },
      redis: {
        host: envs.redisHost,
        port: envs.redisPort,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE.SCRAPING_LIVE_MATCHES },
      { name: QUEUE.SCRAPING_TEAMS },
      { name: QUEUE.SCRAPING_MATCHES },
      { name: QUEUE.SCRAPING_TEAMS_STATS },
      { name: QUEUE.SCRAPING_LEAGUES },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
