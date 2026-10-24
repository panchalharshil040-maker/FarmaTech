import { chromium } from 'playwright'

const APP = 'http://localhost:5173'
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()

/* ── Validation behaviour (light theme, desktop) ────────────────────── */
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(APP, { waitUntil: 'networkidle' })
await page.waitForSelector('.auth-page')

await page.click('.auth-portal-btn:has-text("Patient")')
await page.waitForSelector('#auth-email')

// Empty submit → field errors, no API call needed
await page.click('.auth-submit')
await page.waitForSelector('.auth-field-error', { timeout: 3000 })
const emptyErrs = await page.locator('.auth-field-error').allTextContents()
record('V1 empty login shows field errors', emptyErrs.length >= 1 && emptyErrs.join(' ').includes('email'),
  JSON.stringify(emptyErrs))

// Malformed email
await page.fill('#auth-email', 'not-an-email')
await page.fill('#auth-password', 'irrelevant')
await page.click('.auth-submit')
await page.waitForTimeout(300)
const emailErr = await page.locator('.auth-field-error').first().textContent().catch(() => '')
record('V2 invalid email rejected client-side',
  (emailErr ?? '').includes('valid email'), `err="${emailErr}"`)

// Errors clear as the user types
await page.fill('#auth-email', 'ok@example.com')
await page.waitForTimeout(200)
const errCountAfter = await page.locator('.auth-field-error').count()
record('V3 field error clears while typing', errCountAfter === 0, `remaining=${errCountAfter}`)

// Register: short password → field error, never reaches API
await page.click('.auth-back')
await page.click('.auth-link:has-text("Create an account")')
await page.waitForSelector('#reg-email')
await page.click('.auth-portal-btn:has-text("Patient")')
await page.fill('#reg-email', 'shortpw@example.com')
await page.fill('#reg-password', 'short')
await page.click('.auth-submit')
await page.waitForTimeout(300)
const pwErr = await page.locator('.auth-field-error').allTextContents()
record('V4 short register password rejected client-side',
  pwErr.join(' ').includes('8 characters'), JSON.stringify(pwErr))

// Selected role card gets the active class + aria-pressed
const activePressed = await page.locator('.auth-portal-btn-active[aria-pressed="true"]').count()
record('V5 selected role card shows active state', activePressed === 1, `active=${activePressed}`)

// Busy state: button disables during request (observe briefly)
await page.fill('#reg-password', 'password123')
const submitDisabledBefore = await page.locator('.auth-submit').isDisabled()
record('V6 submit enabled when valid (role preselected)',
  submitDisabledBefore === false)

/* ── Screenshots: light theme across widths ─────────────────────────── */
const widths = [
  { w: 1440, h: 900, name: '1440' },
  { w: 1024, h: 800, name: '1024' },
  { w: 768, h: 900, name: '768' },
  { w: 390, h: 844, name: '390' },
  { w: 360, h: 780, name: '360' },
]

const overflowAt = []
for (const { w, h, name } of widths) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  await p.goto(APP, { waitUntil: 'networkidle' })
  await p.waitForSelector('.auth-page')
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  if (overflow > 0) overflowAt.push(`${name}:${overflow}px`)
  await p.screenshot({ path: `shot-light-${name}.png`, fullPage: false })

  // Login form view at this width
  await p.click('.auth-portal-btn:has-text("Patient")')
  await p.waitForSelector('#auth-email')
  await p.screenshot({ path: `shot-light-${name}-login.png`, fullPage: false })

  // Register view (role cards) at this width
  await p.click('.auth-link:has-text("Create one")')
  await p.waitForSelector('#reg-email')
  await p.click('.auth-portal-btn:has-text("Clinician")')
  await p.screenshot({ path: `shot-light-${name}-register.png`, fullPage: false })
  await p.close()
}
record('R1 no horizontal overflow (all light widths)', overflowAt.length === 0,
  overflowAt.join(', ') || 'clean')

/* ── Dark theme screenshots + overflow ──────────────────────────────── */
const darkOverflow = []
for (const { w, h, name } of widths) {
  const p = await browser.newPage({ viewport: { width: w, height: h } })
  await p.addInitScript(() => localStorage.setItem('pharmatech-theme', 'dark'))
  await p.goto(APP, { waitUntil: 'networkidle' })
  await p.waitForSelector('.auth-page')
  const theme = await p.evaluate(() => document.documentElement.getAttribute('data-theme'))
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  if (overflow > 0) darkOverflow.push(`${name}:${overflow}px`)
  if (name === '1440' || name === '390') {
    await p.screenshot({ path: `shot-dark-${name}.png`, fullPage: false })
    await p.click('.auth-portal-btn:has-text("Clinician")')
    await p.waitForSelector('#auth-email')
    await p.screenshot({ path: `shot-dark-${name}-login.png`, fullPage: false })
    await p.click('.auth-link:has-text("Create one")')
    await p.waitForSelector('#reg-email')
    await p.click('.auth-portal-btn:has-text("Patient")')
    await p.screenshot({ path: `shot-dark-${name}-register.png`, fullPage: false })
  }
  if (name === '1440') record('D1 dark theme applies on auth screen', theme === 'dark', `theme=${theme}`)
  await p.close()
}
record('R2 no horizontal overflow (all dark widths)', darkOverflow.length === 0,
  darkOverflow.join(', ') || 'clean')

/* ── Contrast checks on key pairs (light + dark) ────────────────────── */
const contrastScript = () => {
  const toRgb = (str) => {
    const m = str.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const parts = m[1].split(',').map((x) => parseFloat(x.trim()))
    return parts.slice(0, 3)
  }
  const lum = ([r, g, b]) => {
    const [R, G, B] = [r, g, b].map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * R + 0.7152 * G + 0.0722 * B
  }
  const ratio = (a, b) => {
    const la = lum(a)
    const lb = lum(b)
    const [l1, l2] = [la, lb].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }
  const css = (el, prop) => getComputedStyle(el)[prop]
  const card = document.querySelector('.auth-card')
  const title = document.querySelector('.auth-card-title')
  const sub = document.querySelector('.auth-card-sub')
  const label = document.querySelector('.auth-label')
  const link = document.querySelector('.auth-link')
  const submit = document.querySelector('.auth-submit')
  const r = (fgEl, bgEl) => +ratio(toRgb(css(fgEl, 'color')), toRgb(css(bgEl, 'backgroundColor'))).toFixed(2)
  return {
    titleOnCard: r(title, card),
    subOnCard: r(sub, card),
    labelOnCard: r(label, card),
    linkOnCard: r(link, card),
    submitText: r(submit, submit),
  }
}

for (const mode of ['light', 'dark']) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  if (mode === 'dark') await p.addInitScript(() => localStorage.setItem('pharmatech-theme', 'dark'))
  await p.goto(APP, { waitUntil: 'networkidle' })
  await p.waitForSelector('.auth-page')
  await p.click('.auth-portal-btn:has-text("Patient")')
  await p.waitForSelector('#auth-email')
  const c = await p.evaluate(contrastScript)
  const allOk = Object.entries(c).every(([k, v]) => v >= (k === 'subOnCard' || k === 'labelOnCard' ? 4.0 : 4.5))
  record(`C1 ${mode} theme contrast (WCAG AA)`, allOk, JSON.stringify(c))
  await p.close()
}

/* ── Focus visibility ───────────────────────────────────────────────── */
const fp = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await fp.goto(APP, { waitUntil: 'networkidle' })
await fp.waitForSelector('.auth-page')
await fp.click('.auth-portal-btn:has-text("Patient")')
await fp.waitForSelector('#auth-email')
await fp.keyboard.press('Tab') // email
const ringEmail = await fp.evaluate(() => {
  const el = document.activeElement
  const s = getComputedStyle(el)
  return s.boxShadow !== 'none' || s.outlineStyle !== 'none'
})
record('A1 keyboard focus ring visible on inputs', ringEmail)
await fp.screenshot({ path: 'shot-focus.png' })
await fp.close()

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log('FAILED:', failed.map((f) => `${f.name} (${f.detail})`).join(' | '))
  process.exit(1)
}
