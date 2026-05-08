// Add this method to the TestRunner class
async runScriptTest(test) {
  const { execSync } = require('child_process');
  try {
    const output = execSync(`cd ${process.cwd()} && node ${test.script}`, { encoding: 'utf8' });
    const result = JSON.parse(output);
    const passed = result.passed === true;
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
