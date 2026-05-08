// Add this method to TestRunner class in test_runner.js
async runScriptTest(test) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(exec);
  
  try {
    const { stdout } = await execPromise(`cd ${process.cwd()} && ${test.script}`);
    const result = JSON.parse(stdout);
    const passed = result.passed === test.expected;
    
    return {
      id: test.id,
      name: test.name,
      passed,
      message: result.message || (passed ? 'OK' : 'Failed')
    };
  } catch (err) {
    return { id: test.id, name: test.name, passed: false, message: err.message };
  }
}
