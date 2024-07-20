import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { NATS_SERVICE } from 'src/config';

import { ScrapingService } from './scraping.service';
import { firstValueFrom } from 'rxjs';
import { UpdateTeamStatsDto } from '../dto';

@Injectable()
export class ScrapingTeamStatsService {
  private readonly logger = new Logger(ScrapingTeamStatsService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  async scrapeTeamStats() {
    try {
      this.logger.debug('Starting scraping process for team stats');

      const leagues = await firstValueFrom(
        this.client.send('competitions.get.leagues', {}),
      );

      const { browser } = await this.scrapingService.initializeBrowser();

      for (const league of leagues) {
        const tableURL = `${ScrapingService.baseURL}${league.url}table`;
        this.logger.debug(
          `Scraping team stats for league: ${league.name}, URL: ${tableURL}`,
        );

        const page = await browser.newPage();
        await page.goto(tableURL, { waitUntil: 'networkidle2' });

        const teamStats: UpdateTeamStatsDto[] = await page.evaluate(() => {
          const stats: UpdateTeamStatsDto[] = [];
          const table = document.getElementById('league-table');
          if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row) => {
              const nameElement = row.querySelector(
                '[id$="__league-column__name"] a',
              );

              if (nameElement) {
                const teamStats: UpdateTeamStatsDto = {
                  position: parseInt(
                    row
                      .querySelector('[id$="__league-column__position"]')
                      .textContent.trim(),
                  ),
                  teamName: nameElement.textContent.trim(),
                  matchesPlayed: parseInt(
                    row
                      .querySelector('[id$="__league-column__played"]')
                      .textContent.trim(),
                  ),
                  wins: parseInt(
                    row
                      .querySelector('[id$="__league-column__wins"]')
                      .textContent.trim(),
                  ),
                  draws: parseInt(
                    row
                      .querySelector('[id$="__league-column__draws"]')
                      .textContent.trim(),
                  ),
                  losses: parseInt(
                    row
                      .querySelector('[id$="__league-column__losses"]')
                      .textContent.trim(),
                  ),
                  goalsFor: parseInt(
                    row
                      .querySelector('[id$="__league-column__goalsFor"]')
                      .textContent.trim(),
                  ),
                  goalsAgainst: parseInt(
                    row
                      .querySelector('[id$="__league-column__goalsAgainst"]')
                      .textContent.trim(),
                  ),
                  goalDifference: parseInt(
                    row
                      .querySelector('[id$="__league-column__goalsDiff"]')
                      .textContent.trim(),
                  ),
                  points: parseInt(
                    row
                      .querySelector('[id$="__league-column__points"]')
                      .textContent.trim(),
                  ),
                  liveScoreURL: nameElement.getAttribute('href'),
                  leagueId: undefined,
                };
                stats.push(teamStats);
              }
            });
          }

          return stats;
        });

        // If you wonder why I am assigning the leagueId here, it's because we can't pass the leagueId
        // to the evaluate function
        teamStats.forEach((team) => {
          team.leagueId = league.id;
        });

        this.logger.debug('Team stats', teamStats);

        this.client.emit('stats.update.team', teamStats);

        await page.close();
      }

      await browser.close();

      this.logger.debug('Finished scraping process for team stats');
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping team stats data',
      });
    }
  }
}
