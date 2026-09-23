// Ad-hoc visual inspection against the running dev server.
// Usage: node scripts/inspect.mjs <outDir> <width> <height> "click|<selector>" "shot|<name>" ...
import { chromium } from "@playwright/test";
const [, , out, w = "1440", h = "1000", ...steps] = process.argv;
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto("http://127.0.0.1:5180/");
await page.waitForTimeout(600);
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log("shot", name); };
for (const step of steps) {
  const [cmd, arg, arg2] = step.split("|");
  if (cmd === "shot") await shot(arg);
  else if (cmd === "click") await page.click(arg);
  else if (cmd === "fill") { await page.fill(arg, arg2); }
  else if (cmd === "press") await page.keyboard.press(arg);
  else if (cmd === "wait") await page.waitForTimeout(+arg);
  else if (cmd === "waitfor") await page.waitForSelector(arg);
  else if (cmd === "hover") await page.hover(arg);
  else if (cmd === "wheel") { await page.mouse.move(+arg.split(",")[0], +arg.split(",")[1]); await page.mouse.wheel(0, +arg2); await page.waitForTimeout(300); }
  else if (cmd === "drag") { const [x, y, dx, dy] = arg.split(",").map(Number); await page.mouse.move(x, y); await page.mouse.down({ button: arg2 || "left" }); await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up({ button: arg2 || "left" }); await page.waitForTimeout(300); }
  else if (cmd === "clickat") { const [x, y] = arg.split(",").map(Number); await page.mouse.click(x, y); await page.waitForTimeout(300); }
  else if (cmd === "eval") console.log("eval", arg, "=>", JSON.stringify(await page.evaluate(arg)));
  else if (cmd === "text") console.log("text", arg, "=>", JSON.stringify(await page.locator(arg).first().innerText()));
}
console.log("errors:", errors.length ? "\n" + errors.join("\n") : "none");
await browser.close();
