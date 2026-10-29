// Render docs/diagram/stack.html → docs/diagram/stack.png. Run: node docs/diagram/render.mjs
import { chromium } from '@playwright/test';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2400, height: 800 }, deviceScaleFactor: 1.5 });
await page.goto('file://' + path.join(dir, 'stack.html'));
await page.waitForSelector('html[data-ready]');
await page.locator('#sheet').screenshot({ path: path.join(dir, 'stack.png') });
await browser.close();
