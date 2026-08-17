import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:4173")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'Kategoriler' button to open the mobile menu
        # Kategoriler button
        elem = page.get_by_role('button', name='Kategoriler', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Kampanyalar' link in the navigation/menu to open the campaign listing page and verify it loads.
        # Kampanyalar link
        elem = page.get_by_text('Alışveriş', exact=True).locator("xpath=ancestor-or-self::*[.//a][1]").get_by_role('link', name='Kampanyalar', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> The campaign listing page loads and the browser navigated to /kampanyalar.
        # Assert-outcome: passed
        # Assert: The current URL contains 'kampanyalar'.
        await expect(page).to_have_url(re.compile("kampanyalar"), timeout=15000), "The current URL contains 'kampanyalar'."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    