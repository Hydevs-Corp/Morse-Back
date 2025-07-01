// Setup file for Puppeteer tests
module.exports = {
    launch: {
        headless: true, // Always headless for automated testing
        slowMo: process.env.CI ? 0 : 50,
        devtools: false,
        defaultViewport: {
            width: 1200,
            height: 800,
        },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    },
    browserContext: {
        ignoreHTTPSErrors: true,
    },
};
