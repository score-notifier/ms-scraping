import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { NATS_SERVICE } from '../../config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ScrapingService } from './scraping.service';
import * as puppeteer from 'puppeteer';
import { sleep } from '../helpers';
import { CreateNotificationDto, EventDto } from '../dto';
import { EventType } from '../enums';

@Injectable()
export class ScrapingLiveMatchesService {
  private readonly logger = new Logger(ScrapingLiveMatchesService.name);

  // Map to store last seen events by match URL
  // Needs to avoid sending historical events on the first run.
  //
  //
  // Should store these events in a database in a real-world scenario,
  // I will try to add it if I have time.
  private readonly lastSeenEvents = new Map<string, EventDto[]>();

  private isFirstRun = true;

  constructor(
    private readonly scrapingService: ScrapingService,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {}

  async scrapeLiveMatches() {
    try {
      this.logger.debug('Starting scraping process for live matches');

      const liveMatchesURL = `${ScrapingService.baseURL}/en/football/live/`;

      const { browser, page } = await this.scrapingService.initializeBrowser();

      let previousHeight = 0;
      let currentHeight = 0;
      let newElementsFound = true;
      let pageIndex = 0;
      const set = new Set();

      while (newElementsFound) {
        pageIndex++;
        await page.goto(liveMatchesURL, { waitUntil: 'networkidle2' });

        const matchLinks = await page.evaluate(() => {
          const links: any[] = [];

          const matchRows = document.querySelectorAll(
            '[id$="__match-row__live"]',
          );

          matchRows.forEach((row) => {
            const liveScoreURL = row.querySelector('a').getAttribute('href');
            links.push(liveScoreURL);
          });

          return links;
        });

        matchLinks.forEach((link) => {
          set.add(link);
        });

        this.logger.log(
          `Page: ${pageIndex} Found ${matchLinks.length} live matches`,
        );

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

      for (const link of Array.from(set)) {
        await this.scrapeMatchEvents(
          browser,
          `${ScrapingService.baseURL}${link}?tab=events`,
        );
      }

      this.isFirstRun = false;

      await browser.close();

      this.logger.debug('Finished scraping process for live matches', set.size);
    } catch (error) {
      this.logger.error('Error scraping live match data', error);
      throw new RpcException({
        status: error.status || HttpStatus.BAD_REQUEST,
        message: error.message || 'Error scraping live match data',
      });
    }
  }

  async scrapeMatchEvents(browser: puppeteer.Browser, matchLink: string) {
    const page = await browser.newPage();
    await page.goto(matchLink, { waitUntil: 'networkidle2' });

    const { currentEvents, homeTeamLink, awayTeamLink, leagueLink } =
      await page.evaluate((EventType) => {
        const events: EventDto[] = [];
        const eventElements = document.querySelectorAll(
          '[id^="match-detail__event__"]',
        );
        eventElements.forEach((element) => {
          const minute = element.querySelector('.ys').textContent.trim();
          const homePlayer = element
            .querySelector('.homePlayer .vs')
            .textContent.trim();
          const awayPlayer = element
            .querySelector('.awayPlayer .vs')
            .textContent.trim();
          const eventIcon = element.querySelector('.Vq svg')
            ? element.querySelector('.Vq svg').getAttribute('name')
            : '';

          const eventType: EventType = EventType[eventIcon] || '';

          const event: EventDto = {
            minute,
            homePlayer,
            awayPlayer,
            eventType,
          };

          events.push(event);
        });

        const halfTime = document.querySelector('[id$="halfTimeShort"]');

        if (halfTime) {
          events.push({
            minute: 'HT',
            homePlayer: '',
            awayPlayer: '',
            eventType: EventType.FootballHalfTime,
          });
        }

        const fullTime = document.querySelector('[id$="fullTimeShort"]');
        if (fullTime) {
          events.push({
            minute: 'FT',
            homePlayer: '',
            awayPlayer: '',
            eventType: EventType.FootballFullTime,
          });
        }

        const homeTeamLink = document
          .querySelector('[id$="match-detail_team-name_home-link"]')
          ?.getAttribute('href');

        const awayTeamLink = document
          .querySelector('[id$="match-detail_team-name_away-link"]')
          ?.getAttribute('href');

        const leagueLink =
          document
            .querySelector('[id$="category-header__link"]')
            ?.getAttribute('href') || '';

        return {
          currentEvents: events,
          homeTeamLink,
          awayTeamLink,
          leagueLink,
        };
      }, EventType);

    if (this.isFirstRun) {
      this.logger.debug(
        'First run, storing current events as last seen events for match',
        matchLink,
      );
      // Store the current events as the last seen events on the first run to avoid sending historical events
      this.lastSeenEvents.set(matchLink, currentEvents);
    } else {
      this.logger.debug(
        'Not first run, comparing current events with last seen events for match',
        matchLink,
      );

      const lastEvents = this.lastSeenEvents.get(matchLink) || [];
      const newEvents = currentEvents.filter(
        (event) => !this.isEventSeen(event, lastEvents),
      );

      this.logger.debug(
        `Scraping match lastEvents ${lastEvents.length} - newEvents ${newEvents.length} `,
      );

      for (const event of newEvents) {
        const notificationDto: CreateNotificationDto = {
          homeTeamLiveScoreURL: homeTeamLink,
          awayTeamLiveScoreURL: awayTeamLink,
          leagueLiveScoreURL: leagueLink,
          matchLiveScoreURL: matchLink,
          event,
        };

        this.logger.debug('Emitting new match event', notificationDto);

        this.client.emit('notification.match.event', notificationDto);
      }

      this.lastSeenEvents.set(matchLink, currentEvents);
    }

    await page.close();
  }

  private isEventSeen(event: EventDto, lastEvents: EventDto[]): boolean {
    return lastEvents.some(
      (lastEvent) =>
        lastEvent.minute === event.minute &&
        lastEvent.homePlayer === event.homePlayer &&
        lastEvent.awayPlayer === event.awayPlayer &&
        lastEvent.eventType === event.eventType,
    );
  }
}
