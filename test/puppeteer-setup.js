// Global setup for Puppeteer tests
beforeAll(async () => {
    console.log('Setting up Puppeteer tests...');

    // Wait for the backend to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
    console.log('Cleaning up after Puppeteer tests...');
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Custom matchers or global utilities can be added here
expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () =>
                    `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () =>
                    `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
});
