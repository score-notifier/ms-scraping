import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { NATS_SERVICE } from '../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ScrapingService } from './scraping.service';
import { firstValueFrom } from 'rxjs';
import { formatDate } from './helpers';
import { CreateMatchDto } from './dto';

@Injectable()
export class ScrapingMatchesService {
  private readonly logger = new Logger(ScrapingMatchesService.name);

  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  async scrapeMatches() {
    try {
      this.logger.debug('Starting scraping process for matches');

      const leagues = await firstValueFrom(
        this.client.send('competitions.get.leagues', {}),
      );

      const { browser } = await this.scrapingService.initializeBrowser();

      for (const league of leagues) {
        // Need to implement scrolling strategy if I want to get all the matches
        // right now it is only taking the first page of the infinite scroll.
        //
        //
        // Additionally, these two methods are almost identical, so they could be refactored into one,
        // but I am keeping them separate for now to make it easier to understand
        await Promise.all([
          this.scrapeFixtures(league, browser),
          this.scrapeResults(league, browser),
        ]);
      }

      await browser.close();

      this.logger.debug('Finished scraping process for matches');
    } catch (error) {
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping match data',
      });
    }
  }

  private async scrapeFixtures(league, browser) {
    const matches: Set<CreateMatchDto> = new Set();
    // Future matches will be scraped from the fixtures page
    const fixturesURL = `${ScrapingService.baseURL}${league.url}fixtures`;

    this.logger.debug(
      `Scraping fixtures for league: ${league.name}, URL: ${fixturesURL}`,
    );

    const page = await browser.newPage();
    await page.goto(fixturesURL, { waitUntil: 'networkidle2' });

    const leagueMatches: CreateMatchDto[] = await page.evaluate(() => {
      const matches: CreateMatchDto[] = [];

      const matchRows = document.querySelectorAll('[id$="__match-row"]');

      matchRows.forEach((row) => {
        const homeTeam = row.querySelector(
          '[id$="__match-row__home-team-name"]',
        ).textContent;
        const awayTeam = row.querySelector(
          '[id$="__match-row__away-team-name"]',
        ).textContent;
        const date = row.querySelector('[id$="__match-row__status-or-time"]')
          .previousElementSibling.textContent;
        const time = row.querySelector(
          '[id$="__match-row__status-or-time"]',
        ).textContent;
        const liveScoreURL = row.querySelector('a').getAttribute('href');

        matches.push({
          homeTeam,
          awayTeam,
          date,
          time,
          liveScoreURL,
          UTCDate: undefined,
          result: undefined,
          leagueId: undefined,
        });
      });

      return matches;
    });

    leagueMatches.forEach((match) => {
      matches.add({
        ...match,
        UTCDate: formatDate(match.date, match.time),
        leagueId: league.id,
      });

      this.client.emit('competitions.matches.create', Array.from(matches));
    });

    await page.close();
  }

  private async scrapeResults(league, browser) {
    const matches: Set<CreateMatchDto> = new Set();

    const resultsURL = `${ScrapingService.baseURL}${league.url}results`;

    this.logger.debug(
      `Scraping results for league: ${league.name}, URL: ${resultsURL}`,
    );

    const page = await browser.newPage();
    await page.goto(resultsURL, { waitUntil: 'networkidle2' });

    const leagueMatches: CreateMatchDto[] = await page.evaluate(() => {
      const matches: CreateMatchDto[] = [];

      const matchRows = document.querySelectorAll('[id$="__match-row"]');

      matchRows.forEach((row) => {
        const homeTeam = row.querySelector(
          '[id$="__match-row__home-team-name"]',
        ).textContent;
        const awayTeam = row.querySelector(
          '[id$="__match-row__away-team-name"]',
        ).textContent;
        const date = row.querySelector('[id$="__match-row__status-or-time"]')
          .previousElementSibling.textContent;
        const time = row.querySelector(
          '[id$="__match-row__status-or-time"]',
        ).textContent;
        const homeScore = row.querySelector(
          '[id$="__match-row__home-team-score"]',
        ).textContent;
        const awayScore = row.querySelector(
          '[id$="__match-row__away-team-score"]',
        ).textContent;
        const liveScoreURL = row.querySelector('a').getAttribute('href');

        matches.push({
          homeTeam,
          awayTeam,
          date,
          time,
          result: {
            homeScore: Number(homeScore),
            awayScore: Number(awayScore),
          },
          liveScoreURL,
          UTCDate: undefined,
          leagueId: undefined,
        });
      });

      return matches;
    });

    leagueMatches.forEach((match) => {
      matches.add({
        ...match,
        UTCDate: formatDate(match.date, match.time),
        leagueId: league.id,
      });

      this.client.emit('competitions.matches.create', Array.from(matches));
    });

    await page.close();
  }
}
