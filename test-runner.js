// Test script to verify console suppression works
process.env.NODE_ENV = 'test';

const { execSync } = require('child_process');

try {
    console.log('Running unit tests with NODE_ENV=test...');
    const result = execSync('npx jest src/auth/auth.service.spec.ts --silent', {
        encoding: 'utf8',
        cwd: __dirname,
    });
    console.log('✅ Unit test completed successfully');
    console.log(result);
} catch (error) {
    console.log('❌ Unit test failed:');
    console.log(error.stdout);
    console.log(error.stderr);
}
