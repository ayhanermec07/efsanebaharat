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
        
        # -> Open the mobile menu by clicking the 'Kategoriler' button in the header.
        # Kategoriler button
        elem = page.get_by_role('button', name='Kategoriler', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Sign-in page was not reached via the mobile menu; the browser URL did not change to the sign-in path.
        # Assert-outcome: failed
        # Assert: Expected the browser URL to contain '/giris' so the sign-in page is displayed.
        await expect(page).to_have_url(re.compile("/giris"), timeout=15000), "Expected the browser URL to contain '/giris' so the sign-in page is displayed."
        
        # --> The mobile menu opened but only showed the 'Tüm ürünler' item instead of a sign-in link.
        await page.locator("xpath=/html/body/div/div[1]/header/div/div/nav/div/div/a").nth(0).scroll_into_view_if_needed()
        # Assert-outcome: failed
        # Assert: Expected the mobile menu to include a 'Tüm ürünler' item when opened.
        await expect(page.locator("xpath=/html/body/div/div[1]/header/div/div/nav/div/div/a").nth(0)).to_be_visible(timeout=15000), "Expected the mobile menu to include a 'T\u00fcm \u00fcr\u00fcnler' item when opened."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    