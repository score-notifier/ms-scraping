import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';

import { CreateLeagueDto } from '../dto';

import { sleep } from '../helpers';
import { ScrapingService } from './scraping.service';

@Injectable()
export class ScrapingLeaguesService {
  private readonly logger = new Logger(ScrapingLeaguesService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  async scrapeLeagues() {
    try {
      this.logger.debug('Starting scraping process for leagues');

      const { page, browser } = await this.scrapingService.initializeBrowser();

      let previousHeight = 0;
      let currentHeight = 0;
      let newElementsFound = true;

      while (newElementsFound) {
        const newLeagues = await page.evaluate(() => {
          const elements = document.querySelectorAll(
            'a[id*="category-header__link"]',
          );
          const createLeagueDtoList: CreateLeagueDto[] = [];

          elements.forEach((league) => {
            const href = league.getAttribute('href');
            const attributes = href.split('/');
            const country = attributes[3];
            const name = attributes[4];
            const liveScoreURL = href;

            createLeagueDtoList.push({
              name,
              liveScoreURL,
              country,
            });
          });

          return createLeagueDtoList;
        });

        this.client.emit('competitions.leagues.create', newLeagues);

        // Scroll down by 1000 pixels
        previousHeight = currentHeight;
        await page.evaluate('window.scrollBy(0, 1000)');

        await sleep(1500); // Wait for new elements to load

        currentHeight = (await page.evaluate(
          'window.scrollY + window.innerHeight',
        )) as number;

        // Check if new elements were loaded
        newElementsFound = currentHeight > previousHeight;
      }

      await browser.close();

      this.logger.debug('Finished scraping process for leagues');
    } catch (error) {
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping team data',
      });
    }
  }
}
