const puppeteer = require('puppeteer');

describe('Morse App E2E Tests with Puppeteer', () => {
    let browser;
    let page;

    const BASE_URL = 'http://localhost:5173'; // Vite dev server
    const API_URL = 'http://localhost:3000';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            slowMo: 50, // Slow down actions for debugging
            devtools: false,
            defaultViewport: {
                width: 1200,
                height: 800,
            },
        });

        page = await browser.newPage();

        // Enable console logging
        page.on('console', msg => {
            console.log('PAGE LOG:', msg.text());
        });

        // Handle page errors
        page.on('pageerror', error => {
            console.error('PAGE ERROR:', error.message);
        });

        // Intercept network requests for monitoring
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
        // Clear localStorage and cookies before each test
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        // Delete all cookies
        const cookies = await page.cookies();
        if (cookies.length > 0) {
            await page.deleteCookie(...cookies);
        }
    });

    describe('Authentication Flow', () => {
        test('should complete signup process', async () => {
            await page.goto(BASE_URL);

            // Wait for the page to load
            await page.waitForSelector('body');

            // Look for signup form or navigate to it
            const signupButton = await page.$(
                'button:contains("Sign Up"), a:contains("Sign Up")'
            );
            if (signupButton) {
                await signupButton.click();
            }

            // Fill signup form
            await page.waitForSelector('input[type="email"]', {
                timeout: 5000,
            });
            await page.type(
                'input[type="email"]',
                `test${Date.now()}@example.com`
            );
            await page.type('input[type="password"]', 'testpassword123');
            await page.type('input[name="name"]', 'Test User');

            // Submit form
            await page.click('button[type="submit"]');

            // Wait for successful signup (redirect or success message)
            await page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: 10000,
            });

            // Verify we're on the main app page
            const currentUrl = page.url();
            expect(currentUrl).not.toContain('signup');
        }, 15000);

        test('should complete signin process', async () => {
            await page.goto(BASE_URL);

            // Navigate to signin if needed
            const signinButton = await page.$(
                'button:contains("Sign In"), a:contains("Sign In")'
            );
            if (signinButton) {
                await signinButton.click();
            }

            // Fill signin form
            await page.waitForSelector('input[type="email"]');
            await page.type('input[type="email"]', 'test@example.com');
            await page.type('input[type="password"]', 'testpassword123');

            // Submit form
            await page.click('button[type="submit"]');

            // Wait for authentication to complete
            await page.waitForNavigation({
                waitUntil: 'networkidle0',
                timeout: 10000,
            });

            // Verify authentication success
            const userMenu = await page.$(
                '[data-testid="user-menu"], .user-avatar, .user-profile'
            );
            expect(userMenu).toBeTruthy();
        }, 15000);
    });

    describe('Message Sending Flow', () => {
        beforeEach(async () => {
            // Login before each message test
            await loginUser(page);
        });

        test('should send a message successfully', async () => {
            // Navigate to a conversation or create one
            await navigateToConversation(page);

            // Find message input
            const messageInput = await page.waitForSelector(
                'input[placeholder*="message"], textarea[placeholder*="message"], [data-testid="message-input"]',
                { timeout: 5000 }
            );

            const testMessage = `Test message ${Date.now()}`;

            // Type message
            await messageInput.type(testMessage);

            // Send message (Enter key or send button)
            const sendButton = await page.$(
                'button:contains("Send"), [data-testid="send-button"]'
            );
            if (sendButton) {
                await sendButton.click();
            } else {
                await page.keyboard.press('Enter');
            }

            // Wait for message to appear in the conversation
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

            // Verify message appears in UI
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

            // Send initial message
            const initialMessage = `Initial message ${Date.now()}`;
            await sendMessage(page, initialMessage);

            // Find and right-click the message for context menu
            const messageElement = await page.waitForSelector(
                '.message:last-child, [data-testid="message"]:last-child'
            );
            await messageElement.click({ button: 'right' });

            // Look for edit option
            const editOption = await page.$(
                'button:contains("Edit"), [data-testid="edit-message"]'
            );
            if (editOption) {
                await editOption.click();

                // Edit the message
                const editInput = await page.waitForSelector(
                    'input[value*="Initial"], textarea[value*="Initial"]'
                );
                await editInput.click({ clickCount: 3 }); // Select all
                const updatedMessage = `Updated message ${Date.now()}`;
                await editInput.type(updatedMessage);

                // Save changes
                await page.keyboard.press('Enter');

                // Verify message was updated
                await page.waitForFunction(
                    message => document.body.textContent.includes(message),
                    { timeout: 5000 },
                    updatedMessage
                );
            }
        }, 25000);

        test('should handle message sending errors gracefully', async () => {
            // Simulate network error by intercepting requests
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

            // Try to send a message
            await sendMessage(page, 'This should fail');

            // Look for error message or indication
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
            // This test simulates receiving a message from another user
            await loginUser(page);
            await navigateToConversation(page);

            // Simulate receiving a message via WebSocket/subscription
            // This would typically involve triggering a message from the backend
            await page.evaluate(() => {
                // Simulate GraphQL subscription update
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

            // Wait for message to appear
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

            // Send multiple messages rapidly
            for (let i = 0; i < messageCount; i++) {
                await sendMessage(page, `Rapid message ${i + 1}`);
                await page.waitForTimeout(100); // Small delay between messages
            }

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Verify all messages appear
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
            expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
        }, 30000);

        test('should measure page load performance', async () => {
            const startTime = Date.now();

            await page.goto(BASE_URL);
            await page.waitForSelector('body');

            // Wait for the app to be fully loaded
            await page.waitForLoadState('networkidle');

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            console.log(`Page loaded in ${loadTime}ms`);
            expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
        }, 10000);
    });

    describe('Responsive Design Tests', () => {
        test('should work on mobile viewport', async () => {
            // Set mobile viewport
            await page.setViewport({ width: 375, height: 667 });

            await loginUser(page);
            await navigateToConversation(page);

            // Check if mobile-specific elements are visible
            const mobileMenu = await page.$(
                '.mobile-menu, [data-testid="mobile-menu"]'
            );

            // Send a message on mobile
            await sendMessage(page, 'Mobile message test');

            // Verify message sending works on mobile
            await page.waitForFunction(
                () => document.body.textContent.includes('Mobile message test'),
                { timeout: 5000 }
            );
        }, 15000);

        test('should work on tablet viewport', async () => {
            // Set tablet viewport
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

    // Helper functions
    async function loginUser(page) {
        await page.goto(BASE_URL);

        // Check if already logged in
        const userMenu = await page.$(
            '[data-testid="user-menu"], .user-avatar'
        );
        if (userMenu) {
            return; // Already logged in
        }

        // Navigate to login
        const signinButton = await page.$(
            'button:contains("Sign In"), a:contains("Sign In")'
        );
        if (signinButton) {
            await signinButton.click();
        }

        // Login
        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'testpassword123');
        await page.click('button[type="submit"]');

        await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    async function navigateToConversation(page) {
        // Look for existing conversation or create new one
        const conversationElement = await page.$(
            '.conversation, [data-testid="conversation"]'
        );
        if (conversationElement) {
            await conversationElement.click();
        } else {
            // Create new conversation
            const newConvButton = await page.$(
                'button:contains("New"), [data-testid="new-conversation"]'
            );
            if (newConvButton) {
                await newConvButton.click();
            }
        }

        // Wait for conversation to load
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

        // Wait a moment for the message to be sent
        await page.waitForTimeout(500);
    }
});
