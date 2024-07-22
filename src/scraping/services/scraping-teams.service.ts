import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';

import { CreateTeamDto } from '../dto';

import { ScrapingService } from './scraping.service';
import { firstValueFrom } from 'rxjs';

import pLimit from 'p-limit';

@Injectable()
export class ScrapingTeamsService {
  private readonly logger = new Logger(ScrapingTeamsService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  async scrapeTeams() {
    this.logger.debug('Starting scraping process for teams');
    try {
      const leagues = await this.fetchLeagues();
      const { browser } = await this.scrapingService.initializeBrowser();

      const limit = pLimit(5);
      const scrapingPromises = leagues.map((league) =>
        limit(() => this.scrapeLeagueTeams(browser, league)),
      );

      await Promise.all(scrapingPromises);
      await browser.close();

      this.logger.debug('Finished scraping process for teams');
    } catch (error) {
      this.handleScrapingError(error);
    }
  }

  private async fetchLeagues() {
    try {
      return await firstValueFrom(
        this.client.send('competitions.get.leagues', {}),
      );
    } catch (error) {
      this.logger.error('Error fetching leagues', { error });
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Error fetching leagues',
      });
    }
  }

  private async scrapeLeagueTeams(browser, league) {
    const tableURL = `${ScrapingService.baseURL}${league.liveScoreURL}table`;
    this.logger.debug(
      `Scraping teams for league: ${league.name}, URL: ${tableURL}`,
    );

    let page;
    try {
      page = await browser.newPage();
      await page.goto(tableURL, { waitUntil: 'networkidle2' });

      const leagueTeams = await this.extractTeamsFromPage(page);
      leagueTeams.forEach((team) => {
        team.leagueId = league.id;
      });

      await this.saveTeams(leagueTeams);
    } catch (error) {
      this.logger.error(`Error scraping teams for league: ${league.name}`, {
        error,
        league,
        tableURL,
      });
    } finally {
      if (page) await page.close();
    }
  }

  private async extractTeamsFromPage(page) {
    return await page.evaluate(() => {
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
  }

  private async saveTeams(leagueTeams: CreateTeamDto[]) {
    try {
      await firstValueFrom(
        this.client.send('competitions.teams.create', leagueTeams),
      );
    } catch (error) {
      this.logger.error('Error saving teams to the database', {
        error,
        leagueTeams,
      });
    }
  }

  private handleScrapingError(error) {
    this.logger.error('Error scraping team data', { error });
    throw new RpcException({
      status: error.status || HttpStatus.BAD_REQUEST,
      message: error.message || 'Error scraping team data',
    });
  }
}
