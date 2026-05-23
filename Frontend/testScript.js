const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching browser...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('requestfailed', request => {
        console.log(`Failed Request: ${request.url()} - ${request.failure().errorText}`);
    });
    page.on('response', response => {
        if (!response.ok()) {
            console.log(`Bad Response: ${response.url()} - Status: ${response.status()}`);
        }
    });

    console.log("Navigating to http://localhost:3000 ...");
    await page.goto('http://localhost:3000');

    console.log("Typing 'Paris' into search box...");
    await page.type('#city', 'Paris');
    await page.click('#city');
    await page.keyboard.press('Enter');

    console.log("Waiting for results...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    await browser.close();
    console.log("Done.");
})();
