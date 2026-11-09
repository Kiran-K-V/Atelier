// Drive the running app in headless Chrome: screenshot, console errors, fps, and an optional move script.
// Usage: node scripts/probe.mjs <url> <outDir> [--theme=light|dark] [--width=1440] [--height=900] [--quality=low|medium|high] [--play] [--wait=ms] [--swiftshader]
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const [url = 'http://localhost:5173', outDir = 'probe-out', ...flags] = process.argv.slice(2)
const opt = Object.fromEntries(flags.map((f) => f.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]))
mkdirSync(outDir, { recursive: true })

// Real GPU by default (NVIDIA PRIME offload on hybrid laptops); --swiftshader forces the CPU renderer.
const swiftshader = opt.swiftshader === true
if (!swiftshader) Object.assign(process.env, { __NV_PRIME_RENDER_OFFLOAD: '1', __GLX_VENDOR_LIBRARY_NAME: 'nvidia' })
const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  args: swiftshader
    ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    : ['--headless=new', '--use-gl=angle', '--use-angle=gl-egl', '--enable-gpu', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({
  viewport: { width: Number(opt.width ?? 1440), height: Number(opt.height ?? 900) },
  colorScheme: opt.theme === 'light' ? 'light' : 'dark',
  deviceScaleFactor: 1,
})
if (opt.quality) {
  await page.addInitScript((q) => {
    localStorage.setItem('atelier-settings', JSON.stringify({ state: { theme: 'system', quality: q, qualityAuto: false, reducedMotionUser: null, sound: true }, version: 0 }))
  }, opt.quality)
}
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && logs.push(`[${m.type()}] ${m.text()}`))
page.on('response', (r) => r.status() >= 400 && logs.push(`[http ${r.status()}] ${r.url()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(4000)
const tag = `${opt.theme ?? 'dark'}-${opt.width ?? 1440}`
await page.screenshot({ path: `${outDir}/${tag}-start.png` })

const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let n = 0
      const t0 = performance.now()
      const tick = () => (++n, performance.now() - t0 < 2000 ? requestAnimationFrame(tick) : resolve((n * 1000) / (performance.now() - t0)))
      requestAnimationFrame(tick)
    }),
)

let played = null
if (opt.play) {
  // Keyboard play path: focus the board, move cursor e2 -> e4.
  const board = page.getByLabel(/chess board/i).first()
  await board.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(Number(opt.wait ?? 6000))
  await page.screenshot({ path: `${outDir}/${tag}-after-e4.png` })
  played = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent ?? null)
}

console.log(JSON.stringify({ fps: Math.round(fps), played, logs: logs.slice(0, 20) }, null, 2))
await browser.close()
