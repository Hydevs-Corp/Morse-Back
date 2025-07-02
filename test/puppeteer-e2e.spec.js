const puppeteer = require('puppeteer');

describe('Morse App E2E Tests with Puppeteer', () => {
    let browser;
    let page;

    const BASE_URL = 'http://localhost:5173';
    const API_URL = 'http://localhost:3000';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 50,
            devtools: false,
            defaultViewport: {
                width: 1200,
                height: 800,
            },
        });

        page = await browser.newPage();

        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });

        page.on('pageerror', error => {
            console.error('PAGE ERROR:', error.message);
        });

        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.url().includes('graphql')) {
                console.log('GraphQL Request:', request.postData());
            }
            request.continue();
        });
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        const cookies = await page.cookies();
        if (cookies.length > 0) {
            await page.deleteCookie(...cookies);
        }
    });

    describe('Authentication Flow', () => {
        test('should complete signup process', async () => {
            await page.goto(BASE_URL);

            await page.waitForSelector('body');

            const signupButton = await page.$(
                'button:contains("Sign Up"), a:contains("Sign Up")'
            );
            if (signupButton) {
                await signupButton.click();
            }

            await page.waitForSelector('input[type="email"]', {
                timeout: 5000,
            });
            await page.type(
                'input[type="email"]',
                `test${Date.now()}@example.com`
            );
            await page.type('input[type="password"]', 'testpassword123');
            await page.type('input[name="name"]', 'Test User');

            await page.click('button[type="submit"]');

            await page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: 10000,
            });

            const currentUrl = page.url();
            expect(currentUrl).not.toContain('signup');
        }, 15000);

        test('should complete signin process', async () => {
            await page.goto(BASE_URL);

            const signinButton = await page.$(
                'button:contains("Sign In"), a:contains("Sign In")'
            );
            if (signinButton) {
                await signinButton.click();
            }

            await page.waitForSelector('input[type="email"]');
            await page.type('input[type="email"]', 'test@example.com');
            await page.type('input[type="password"]', 'testpassword123');

            await page.click('button[type="submit"]');

            await page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: 10000,
            });

            const userMenu = await page.$(
                '[data-testid="user-menu"], .user-avatar, .user-profile'
            );
            expect(userMenu).toBeTruthy();
        }, 15000);
    });

    describe('Message Sending Flow', () => {
        beforeEach(async () => {
            await loginUser(page);
        });

        test('should send a message successfully', async () => {
            await navigateToConversation(page);

            const messageInput = await page.waitForSelector(
                'input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="message-input"]',
                { timeout: 5000 }
            );

            const testMessage = `Test message ${Date.now()}`;

            await messageInput.type(testMessage);

            const sendButton = await page.$(
                'button:contains("Send"), [data-testid="send-button"]'
            );
            if (sendButton) {
                await sendButton.click();
            } else {
                await page.keyboard.press('Enter');
            }

            await page.waitForFunction(
                message => {
                    const messageElements = document.querySelectorAll(
                        '.message, [data-testid="message"]'
                    );
                    return Array.from(messageElements).some(el =>
                        el.textContent.includes(message)
                    );
                },
                { timeout: 5000 },
                testMessage
            );

            const messageElements = await page.$$eval(
                '.message, [data-testid="message"]',
                elements => elements.map(el => el.textContent)
            );

            const messageFound = messageElements.some(text =>
                text.includes(testMessage)
            );
            expect(messageFound).toBe(true);
        }, 20000);

        test('should update a message', async () => {
            await navigateToConversation(page);

            const initialMessage = `Initial message ${Date.now()}`;
            await sendMessage(page, initialMessage);

            const messageElement = await page.waitForSelector(
                '.message:last-child, [data-testid="message"]:last-child'
            );
            await messageElement.click({ button: 'right' });

            const editOption = await page.$(
                'button:contains("Edit"), [data-testid="edit-message"]'
            );
            if (editOption) {
                await editOption.click();

                const editInput = await page.waitForSelector(
                    'input[value*="Initial"], textarea[value*="Initial"]'
                );
                await editInput.click({ clickCount: 3 });
                const updatedMessage = `Updated message ${Date.now()}`;
                await editInput.type(updatedMessage);

                await page.keyboard.press('Enter');

                await page.waitForFunction(
                    message => document.body.textContent.includes(message),
                    { timeout: 5000 },
                    updatedMessage
                );
            }
        }, 25000);

        test('should handle message sending errors gracefully', async () => {
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (
                    request.url().includes('graphql') &&
                    request.postData()?.includes('sendMessage')
                ) {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            await navigateToConversation(page);

            await sendMessage(page, 'This should fail');

            await page.waitForSelector(
                '.error, .alert, [data-testid="error"]',
                { timeout: 5000 }
            );

            const errorVisible = await page.$(
                '.error, .alert, [data-testid="error"]'
            );
            expect(errorVisible).toBeTruthy();
        }, 15000);
    });

    describe('Real-time Message Reception', () => {
        test('should receive messages in real-time', async () => {
            await loginUser(page);
            await navigateToConversation(page);

            await page.evaluate(() => {
                window.dispatchEvent(
                    new CustomEvent('message-received', {
                        detail: {
                            id: Date.now(),
                            content: 'Message from another user',
                            user: { id: 2, name: 'Other User' },
                            createdAt: new Date().toISOString(),
                        },
                    })
                );
            });

            await page.waitForFunction(
                () =>
                    document.body.textContent.includes(
                        'Message from another user'
                    ),
                { timeout: 5000 }
            );
        }, 15000);
    });

    describe('Performance Tests', () => {
        test('should handle rapid message sending', async () => {
            await loginUser(page);
            await navigateToConversation(page);

            const startTime = Date.now();
            const messageCount = 5;

            for (let i = 0; i < messageCount; i++) {
                await sendMessage(page, `Rapid message ${i + 1}`);
                await page.waitForTimeout(100);
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            await page.waitForFunction(
                count => {
                    const messages = document.querySelectorAll(
                        '.message, [data-testid="message"]'
                    );
                    return messages.length >= count;
                },
                { timeout: 10000 },
                messageCount
            );

            console.log(`Sent ${messageCount} messages in ${totalTime}ms`);
            expect(totalTime).toBeLessThan(10000);
        }, 30000);

        test('should measure page load performance', async () => {
            const startTime = Date.now();

            await page.goto(BASE_URL);
            await page.waitForSelector('body');

            await page.waitForLoadState('networkidle');

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            console.log(`Page loaded in ${loadTime}ms`);
            expect(loadTime).toBeLessThan(5000);
        }, 10000);
    });

    describe('Responsive Design Tests', () => {
        test('should work on mobile viewport', async () => {
            await page.setViewport({ width: 375, height: 667 });

            await loginUser(page);
            await navigateToConversation(page);

            const mobileMenu = await page.$(
                '.mobile-menu, [data-testid="mobile-menu"]'
            );

            await sendMessage(page, 'Mobile message test');

            await page.waitForFunction(
                () => document.body.textContent.includes('Mobile message test'),
                { timeout: 5000 }
            );
        }, 15000);

        test('should work on tablet viewport', async () => {
            await page.setViewport({ width: 768, height: 1024 });

            await loginUser(page);
            await navigateToConversation(page);

            await sendMessage(page, 'Tablet message test');

            await page.waitForFunction(
                () => document.body.textContent.includes('Tablet message test'),
                { timeout: 5000 }
            );
        }, 15000);
    });

    async function loginUser(page) {
        await page.goto(BASE_URL);

        const userMenu = await page.$(
            '[data-testid="user-menu"], .user-avatar'
        );
        if (userMenu) {
            return;
        }

        const signinButton = await page.$(
            'button:contains("Sign In"), a:contains("Sign In")'
        );
        if (signinButton) {
            await signinButton.click();
        }

        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'testpassword123');
        await page.click('button[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    async function navigateToConversation(page) {
        const conversationElement = await page.$(
            '.conversation, [data-testid="conversation"]'
        );
        if (conversationElement) {
            await conversationElement.click();
        } else {
            const newConvButton = await page.$(
                'button:contains("New"), [data-testid="new-conversation"]'
            );
            if (newConvButton) {
                await newConvButton.click();
            }
        }

        await page.waitForSelector(
            '[data-testid="message-input"], input[placeholder*="message"]',
            { timeout: 5000 }
        );
    }

    async function sendMessage(page, message) {
        const messageInput = await page.waitForSelector(
            'input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="message-input"]'
        );

        await messageInput.type(message);

        const sendButton = await page.$(
            'button:contains("Send"), [data-testid="send-button"]'
        );
        if (sendButton) {
            await sendButton.click();
        } else {
            await page.keyboard.press('Enter');
        }

        await page.waitForTimeout(500);
    }
});
