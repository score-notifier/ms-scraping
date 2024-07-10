import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { ScrapingService } from './scraping.service';

@Controller()
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @MessagePattern('scraping.team.start')
  async scrapeTeams() {
    return this.scrapingService.scrapeTeams();
  }
}
