import puppeteer from "puppeteer";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";

const screenshotDir = "./temporary screenshots";
if (!existsSync(screenshotDir)) {
  mkdirSync(screenshotDir, { recursive: true });
}

// Auto-increment screenshot number
const existing = existsSync(screenshotDir)
  ? readdirSync(screenshotDir).filter((f) => f.endsWith(".png"))
  : [];
const numbers = existing
  .map((f) => parseInt(f.match(/^screenshot-(\d+)/)?.[1] || "0"))
  .filter((n) => !isNaN(n));
const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

const filename = label
  ? `screenshot-${next}-${label}.png`
  : `screenshot-${next}.png`;
const filepath = join(screenshotDir, filename);

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: puppeteer.executablePath(),
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0" });
await page.screenshot({ path: filepath, fullPage: true });

await browser.close();
console.log(`Screenshot saved: ${filepath}`);
