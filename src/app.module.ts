import { Module } from '@nestjs/common';
import { ScrapingModule } from './scraping/scraping.module';

@Module({
  imports: [ScrapingModule],
})
export class AppModule {}
