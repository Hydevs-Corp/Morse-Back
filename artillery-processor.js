module.exports = {
    // Generate random email for each virtual user
    generateRandomEmail: function (context, events, done) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        context.vars.email = `test${timestamp}${random}@example.com`;
        context.vars.password = 'testpassword123';
        context.vars.name = `Test User ${random}`;
        return done();
    },

    // Log response times for monitoring
    logResponseTime: function (requestParams, response, context, ee, next) {
        if (response.body && response.body.data) {
            console.log(
                `Request: ${requestParams.name || 'unknown'}, Response Time: ${response.timings.response}ms`
            );
        }
        return next();
    },

    // Track RabbitMQ metrics (if accessible)
    trackRabbitMQMetrics: function (context, events, done) {
        // This would connect to RabbitMQ management API to get metrics
        // For now, we'll just log the attempt
        console.log('Tracking RabbitMQ metrics...');
        return done();
    },

    // Custom assertions
    assertResponseTime: function (requestParams, response, context, ee, next) {
        // Assert that sendMessage responses are under 500ms
        if (requestParams.name === 'sendMessage') {
            if (response.timings.response > 500) {
                console.warn(
                    `WARNING: sendMessage took ${response.timings.response}ms (expected < 500ms)`
                );
            }
        }
        return next();
    },

    // Generate test data
    generateTestMessage: function (context, events, done) {
        const messages = [
            'Hello from performance test!',
            'Testing message sending speed',
            'Performance test message with some content',
            'Quick message for load testing',
            'Another test message for performance evaluation',
        ];

        context.vars.testMessage =
            messages[Math.floor(Math.random() * messages.length)];
        return done();
    },

    // Monitor memory usage (simplified)
    monitorMemory: function (context, events, done) {
        const used = process.memoryUsage();
        console.log(
            `Artillery Memory Usage - RSS: ${Math.round((used.rss / 1024 / 1024) * 100) / 100} MB`
        );
        return done();
    },

    // Setup phase - prepare test data
    setupPhase: function (context, events, done) {
        console.log('Setting up performance test...');

        // Initialize metrics tracking
        if (!global.performanceMetrics) {
            global.performanceMetrics = {
                sendMessageTimes: [],
                authTimes: [],
                errors: 0,
                startTime: Date.now(),
            };
        }

        return done();
    },

    // Record metrics for analysis
    recordMetrics: function (requestParams, response, context, ee, next) {
        if (!global.performanceMetrics) {
            global.performanceMetrics = {
                sendMessageTimes: [],
                authTimes: [],
                errors: 0,
                startTime: Date.now(),
            };
        }

        const responseTime = response.timings.response;

        if (requestParams.name === 'sendMessage') {
            global.performanceMetrics.sendMessageTimes.push(responseTime);
        } else if (requestParams.url && requestParams.url.includes('signin')) {
            global.performanceMetrics.authTimes.push(responseTime);
        }

        if (
            response.statusCode >= 400 ||
            (response.body && response.body.errors)
        ) {
            global.performanceMetrics.errors++;
        }

        return next();
    },

    // Print summary at the end
    printSummary: function (context, events, done) {
        if (
            global.performanceMetrics &&
            global.performanceMetrics.sendMessageTimes.length > 0
        ) {
            const sendTimes = global.performanceMetrics.sendMessageTimes;
            const avgSendTime =
                sendTimes.reduce((a, b) => a + b, 0) / sendTimes.length;
            const maxSendTime = Math.max(...sendTimes);
            const minSendTime = Math.min(...sendTimes);

            console.log('\n=== PERFORMANCE SUMMARY ===');
            console.log(
                `Send Message - Avg: ${avgSendTime.toFixed(2)}ms, Min: ${minSendTime}ms, Max: ${maxSendTime}ms`
            );
            console.log(`Total Errors: ${global.performanceMetrics.errors}`);
            console.log(
                `Test Duration: ${((Date.now() - global.performanceMetrics.startTime) / 1000).toFixed(2)}s`
            );
            console.log('===========================\n');
        }

        return done();
    },
};
