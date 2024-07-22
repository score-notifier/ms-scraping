import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class ScrapingService {
  static baseURL = 'https://www.livescore.com';
  private readonly logger = new Logger(ScrapingService.name);

  async initializeBrowser() {
    this.logger.debug('Initialize Browser');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    page.setDefaultNavigationTimeout(2 * 60 * 1000);

    await Promise.all([
      page.waitForNavigation(),
      page.goto(ScrapingService.baseURL, {
        waitUntil: 'networkidle2',
      }),
    ]);

    return { browser, page };
  }
}
