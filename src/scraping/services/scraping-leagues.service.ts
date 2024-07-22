import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import { CreateLeagueDto } from '../dto';
import { ScrapingService } from './scraping.service';
import { firstValueFrom } from 'rxjs';
import { sleep } from '../helpers';

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

      let previousDataIndex = 0;
      let counter = 0;
      const threshold = 2;

      while (true) {
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

        this.logger.debug(`New leagues found: ${newLeagues.length}`);

        await firstValueFrom(
          this.client.send<void>('competitions.leagues.create', newLeagues),
        );

        await page.evaluate('window.scrollBy(0, 1000)');

        // Wait for elements to load
        await sleep(500);

        // Get the last element's data-index attribute in the virtual list
        const currentDataIndex = await page.evaluate(() => {
          const elements = document.querySelectorAll('div[data-index]');
          const lastElement = elements[elements.length - 1];
          return lastElement
            ? Number(lastElement.getAttribute('data-index'))
            : null;
        });

        // A little bit of logic to break the loop if the same data-index is found multiple times
        // I couldn't find a better way to detect the end of the list and get all the leagues.
        // Might be better to use a different approach to scrape the leagues.
        if (currentDataIndex) {
          if (currentDataIndex === previousDataIndex) {
            counter++;
          } else {
            counter = 0;
          }

          if (currentDataIndex !== 0 && counter > threshold) {
            this.logger.debug(
              `Current Data Index: ${currentDataIndex}, Counter: ${counter}. Threshold reached. Exiting loop.`,
            );
            break;
          }

          previousDataIndex = currentDataIndex;
        }
      }

      await browser.close();

      this.logger.debug('Finished scraping process for leagues');
    } catch (error) {
      this.logger.error('Error scraping league data', error);
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping league data',
      });
    }
  }
}
