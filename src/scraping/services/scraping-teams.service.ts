import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';

import { CreateTeamDto } from '../dto';

import { ScrapingService } from './scraping.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ScrapingTeamsService {
  private readonly logger = new Logger(ScrapingTeamsService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  async scrapeTeams() {
    try {
      this.logger.debug('Starting scraping process for teams');

      const leagues = await firstValueFrom(
        this.client.send('competitions.get.leagues', {}),
      );

      const { browser } = await this.scrapingService.initializeBrowser();

      for (const league of leagues) {
        const tableURL = `${ScrapingService.baseURL}${league.liveScoreURL}table`;
        this.logger.debug(
          `Scraping teams for league: ${league.name}, URL: ${tableURL}`,
        );

        const page = await browser.newPage();
        await page.goto(tableURL, { waitUntil: 'networkidle2' });

        // TODO:
        // Sometimes the table is not loaded properly, I am not sure why
        // an alternative is to scrap the matches and there we can get the teams of a league
        // I will try to fix it on the matches scraping service if I have time
        const leagueTeams: CreateTeamDto[] = await page.evaluate(() => {
          const teams = [];
          const table = document.getElementById('league-table');
          if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row) => {
              const nameElement = row.querySelector(
                '[id$="__league-column__name"] a',
              );

              if (nameElement) {
                teams.push({
                  name: nameElement.textContent.trim(),
                  liveScoreURL: nameElement.getAttribute('href'),
                });
              }
            });
          }

          return teams;
        });

        leagueTeams.forEach((team) => {
          team.leagueId = league.id;
        });

        this.client.emit('competitions.teams.create', leagueTeams);

        await page.close();
      }

      await browser.close();

      this.logger.debug('Finished scraping process for teams');
    } catch (error) {
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping team data',
      });
    }
  }
}
