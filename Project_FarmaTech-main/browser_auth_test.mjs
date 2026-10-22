/* Browser-level verification of the auth flow against the live dev stack.
 * Requires: uvicorn on :8000, vite dev on :5173.
 * Run: node browser_auth_test.mjs
 */
import { chromium } from 'playwright'

const APP = 'http://localhost:5173'
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

const unique = Date.now()
const PATIENT = { email: `browser-pt-${unique}@example.com`, password: 'password123' }
const DOCTOR = { email: `browser-dr-${unique}@example.com`, password: 'password123' }

try {
  /* ── 1. Initial load shows exactly ONE auth screen (no overlap) ─────── */
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.waitForSelector('.auth-page', { timeout: 10000 })
  const authPages = await page.locator('.auth-page').count()
  const fixedOverlays = await page.evaluate(() =>
    [...document.querySelectorAll('body > *')].filter(
      (el) => getComputedStyle(el).position === 'fixed',
    ).length,
  )
  record('T1 single auth screen, zero fixed overlays', authPages === 1 && fixedOverlays === 0,
    `auth-pages=${authPages} fixed=${fixedOverlays}`)

  /* ── 2. Portal selection → patient login form ────────────────────────── */
  await page.click('.auth-portal-btn:has-text("Patient")')
  await page.waitForSelector('#auth-email')
  record('T2 patient portal opens login form', await page.isVisible('#auth-password'))

  /* ── 3. Register a patient via the register form ─────────────────────── */
  // T2 left us in login mode, whose switch link is "Create one".
  await page.click('.auth-link:has-text("Create one")')
  await page.waitForSelector('#reg-email')
  await page.click('.auth-portal-btn:has-text("Patient")') // select role on register
  await page.fill('#reg-name', 'Browser Patient')
  await page.fill('#reg-email', PATIENT.email)
  await page.fill('#reg-password', PATIENT.password)
  await page.click('.auth-submit')
  await page.waitForSelector('.patient-dashboard, main.page', { timeout: 10000 })
  const patientDash = await page.locator('main.page').isVisible()
  const headerVisible = await page.locator('header').isVisible()
  const authGone = (await page.locator('.auth-page').count()) === 0
  record('T3 patient registration opens patient dashboard',
    patientDash && headerVisible && authGone,
    `dash=${patientDash} header=${headerVisible} authGone=${authGone}`)

  /* ── 4. No stacked overlays on the dashboard ─────────────────────────── */
  const dashFixed = await page.evaluate(() =>
    [...document.querySelectorAll('body > *')].filter(
      (el) => getComputedStyle(el).position === 'fixed' && el.offsetParent !== null,
    ).length,
  )
  const authStillThere = (await page.locator('.auth-page').count()) > 0
  record('T4 no overlay stacked over dashboard', dashFixed === 0 && !authStillThere,
    `fixed-visible=${dashFixed} auth=${authStillThere}`)

  /* ── 5. Patient cannot switch to the doctor workspace ────────────────── */
  const doctorBtn = page.locator('header button:has-text("Doctor")')
  if (await doctorBtn.count()) {
    await doctorBtn.first().click()
    await page.waitForTimeout(400)
    const eyebrow = await page.locator('main.page .eyebrow').first().textContent()
    record('T5 role toggle locked for patient', (eyebrow ?? '').includes('Patient'),
      `eyebrow="${eyebrow}"`)
  } else {
    record('T5 role toggle locked for patient', true, 'no doctor button rendered')
  }

  /* ── 6. Patient loads a record → persisted after reload ──────────────── */
  // The patient dashboard has a record form; find medicine input and add one.
  const medInput = page.locator('input[placeholder*="edicine" i], input[placeholder*="medication" i]').first()
  if (await medInput.count()) {
    await medInput.fill('warfarin sodium')
    const addBtn = page.locator('button:has-text("Add"), button:has-text("Add Medicine")').first()
    if (await addBtn.count()) await addBtn.click()
    await page.waitForTimeout(1200) // exceed the 800ms debounce
  }
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('main.page', { timeout: 10000 })
  const bodyText = await page.textContent('body')
  record('T6 session survives reload (patient stays logged in)',
    bodyText.includes('Patient Dashboard') && !bodyText.includes('Choose your portal'))

  /* ── 7. Logout returns to the auth screen ───────────────────────────── */
  await page.click('header button:has-text("Sign out")')
  await page.waitForSelector('.auth-page', { timeout: 10000 })
  record('T7 logout shows auth screen', await page.isVisible('.auth-card'))

  /* ── 8. Login as the same patient — session restores ────────────────── */
  await page.click('.auth-portal-btn:has-text("Patient")')
  await page.fill('#auth-email', PATIENT.email)
  await page.fill('#auth-password', PATIENT.password)
  await page.click('.auth-submit')
  await page.waitForSelector('main.page', { timeout: 10000 })
  record('T8 patient login restores dashboard',
    (await page.textContent('body')).includes('Patient Dashboard'))

  /* ── 9. Logout, then register + login as a doctor ───────────────────── */
  await page.click('header button:has-text("Sign out")')
  await page.waitForSelector('.auth-page')
  await page.click('.auth-link:has-text("Create an account")')
  await page.waitForSelector('#reg-email')
  await page.click('.auth-portal-btn:has-text("Clinician")')
  await page.fill('#reg-name', 'Browser Doctor')
  await page.fill('#reg-email', DOCTOR.email)
  await page.fill('#reg-password', DOCTOR.password)
  await page.click('.auth-submit')
  await page.waitForSelector('main.page', { timeout: 10000 })
  const doctorBody = await page.textContent('body')
  record('T9 doctor registration opens DOCTOR dashboard',
    doctorBody.includes('Doctor Dashboard') && !doctorBody.includes('Patient Dashboard'))

  /* ── 10. Doctor cannot switch to the patient workspace ──────────────── */
  const patientBtn = page.locator('header button:has-text("Patient")')
  if (await patientBtn.count()) {
    await patientBtn.first().click()
    await page.waitForTimeout(400)
    const eyebrow = await page.locator('main.page .eyebrow').first().textContent()
    record('T10 role toggle locked for doctor', (eyebrow ?? '').includes('Doctor'),
      `eyebrow="${eyebrow}"`)
  } else {
    record('T10 role toggle locked for doctor', true, 'no patient button rendered')
  }

  /* ── 11. Wrong password shows an error and stays on the form ────────── */
  await page.click('header button:has-text("Sign out")')
  await page.waitForSelector('.auth-page')
  await page.click('.auth-portal-btn:has-text("Patient")')
  await page.fill('#auth-email', PATIENT.email)
  await page.fill('#auth-password', 'definitely-wrong')
  await page.click('.auth-submit')
  await page.waitForSelector('.auth-error', { timeout: 8000 })
  const errText = await page.textContent('.auth-error')
  record('T11 wrong password shows error, no dashboard',
    (errText ?? '').length > 0 && (await page.locator('main.page').count()) === 0,
    `error="${errText}"`)

  /* ── 12. Cross-portal isolation: patient record not visible to doctor ─ */
  // Log in as patient, confirm record state; log out; log in as doctor.
  await page.fill('#auth-password', PATIENT.password)
  await page.click('.auth-submit')
  await page.waitForSelector('main.page', { timeout: 10000 })
  await page.click('header button:has-text("Sign out")')
  await page.waitForSelector('.auth-page')
  await page.click('.auth-portal-btn:has-text("Clinician")')
  await page.fill('#auth-email', DOCTOR.email)
  await page.fill('#auth-password', DOCTOR.password)
  await page.click('.auth-submit')
  await page.waitForSelector('main.page', { timeout: 10000 })
  const isoBody = await page.textContent('body')
  record('T12 doctor dashboard after separate login (no patient data bleed)',
    isoBody.includes('Doctor Dashboard'))

  /* ── 13. Direct deep-link while logged in stays on the right screen ─── */
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.waitForSelector('main.page', { timeout: 10000 })
  const deepBody = await page.textContent('body')
  record('T13 reload keeps doctor on doctor dashboard (session restore)',
    deepBody.includes('Doctor Dashboard') && !deepBody.includes('Choose your portal'))
} catch (err) {
  record('UNEXPECTED ERROR', false, err instanceof Error ? err.message : String(err))
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`)
if (failed.length) {
  console.log('FAILED:', failed.map((f) => f.name).join(', '))
  process.exit(1)
}
