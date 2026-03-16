import puppeteer from 'puppeteer';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';
const dir = './temporary screenshots';

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const existing = readdirSync(dir).filter(f => f.startsWith('screenshot-'));
const next = existing.length + 1;
const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
await page.screenshot({ path: join(dir, filename), fullPage: false });
await browser.close();

console.log(`Saved: ${join(dir, filename)}`);
