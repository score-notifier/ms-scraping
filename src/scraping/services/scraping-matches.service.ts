import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { NATS_SERVICE } from '../../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ScrapingService } from './scraping.service';
import { firstValueFrom } from 'rxjs';
import { formatDate, sleep } from '../helpers';
import { CreateMatchDto } from '../dto';
import * as puppeteer from 'puppeteer';

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
        // TODO:
        // These two methods are almost identical, so they could be refactored into one,
        // but I am keeping them separate for now to make it easier to understand
        //
        // Additionally, sometimes the teams scraping service is not finding the table,
        // looks like the league webpage does not load the table properly sometimes.
        // I could get the teams from the matches page for leagues without tables, however,
        // I will leave it as is for now and try to fix it later if I have time.
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

  private async scrapeFixtures(league, browser: puppeteer.Browser) {
    // Future matches will be scraped from the fixtures page
    const fixturesURL = `${ScrapingService.baseURL}${league.liveScoreURL}fixtures`;

    this.logger.debug(
      `Scraping fixtures for league: ${league.name}, URL: ${fixturesURL}`,
    );

    const page = await browser.newPage();
    await page.goto(fixturesURL, { waitUntil: 'networkidle2' });

    let previousHeight = 0;
    let currentHeight = 0;
    let newElementsFound = true;

    while (newElementsFound) {
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
        match.leagueId = league.id;
        match.UTCDate = formatDate(match.date, match.time);
      });

      this.logger.log(`Found ${leagueMatches.length} fixtures matches`);

      this.client.emit('competitions.matches.create', leagueMatches);

      // Scroll down by 1000 pixels
      previousHeight = currentHeight;
      await page.evaluate('window.scrollBy(0, 1000)');

      await sleep(1000); // Wait for new elements to load

      currentHeight = (await page.evaluate(
        'window.scrollY + window.innerHeight',
      )) as number;

      // Check if new elements were loaded
      newElementsFound = currentHeight > previousHeight;
    }

    this.logger.debug(
      `Finished Scraping fixtures for league: ${league.name}, URL: ${fixturesURL}`,
    );

    await page.close();
  }

  private async scrapeResults(league, browser: puppeteer.Browser) {
    const resultsURL = `${ScrapingService.baseURL}${league.liveScoreURL}results`;

    this.logger.debug(
      `Scraping results for league: ${league.name}, URL: ${resultsURL}`,
    );

    const page = await browser.newPage();
    await page.goto(resultsURL, { waitUntil: 'networkidle2' });

    let previousHeight = 0;
    let currentHeight = 0;
    let newElementsFound = true;

    while (newElementsFound) {
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
        match.leagueId = league.id;
        match.UTCDate = formatDate(match.date, match.time);
      });

      this.logger.log(`Found ${leagueMatches.length} results matches`);

      this.client.emit('competitions.matches.create', leagueMatches);

      // Scroll down by 1000 pixels
      previousHeight = currentHeight;
      await page.evaluate('window.scrollBy(0, 1000)');

      await sleep(1000); // Wait for new elements to load

      currentHeight = (await page.evaluate(
        'window.scrollY + window.innerHeight',
      )) as number;

      // Check if new elements were loaded
      newElementsFound = currentHeight > previousHeight;
    }

    this.logger.debug(
      `Finished Scraping Results for league: ${league.name}, URL: ${resultsURL}`,
    );

    await page.close();
  }
}
