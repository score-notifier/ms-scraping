import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';
import * as puppeteer from 'puppeteer';

import { CreateTeamDto } from './dto';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {}

  async scrapeTeams() {
    try {
      this.logger.debug('Starting scraping process for teams');

      const browser = await puppeteer.launch({
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      await page.setViewport({ width: 1920, height: 1080 });

      page.setDefaultNavigationTimeout(2 * 60 * 1000);

      await Promise.all([
        page.waitForNavigation(),
        page.goto('https://www.livescore.com/en/', {
          waitUntil: 'networkidle2',
        }),
      ]);

      // The teams listed here is not the full list of teams.
      // Need to figure out better way of listing all the teams.
      const teams = await page.evaluate(() => {
        const teamElements = document.querySelectorAll(
          'a[href*="/en/football/team/"]',
        );
        const createTeamDtoList: CreateTeamDto[] = [];

        teamElements.forEach((team) => {
          const liveScoreId: string = team.getAttribute('href').split('/')[5]; // Livescore team ID
          const name: string = team.querySelector('.ej').textContent.trim();
          // const leagueId = team.querySelector('.dj').textContent.trim(); // This is not the league ID
          const leagueId: string = '15ed7a50-db72-4f13-afbc-af4268b492bc'; // Fake league ID for now

          createTeamDtoList.push({
            liveScoreId: +liveScoreId,
            name,
            leagueId,
          });
        });

        return createTeamDtoList;
      });

      await browser.close();

      this.logger.debug('Finished scraping process for teams');

      this.client.emit('competitions.teams.create', teams);

      return teams;
    } catch (error) {
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping team data',
      });
    }
  }
}
