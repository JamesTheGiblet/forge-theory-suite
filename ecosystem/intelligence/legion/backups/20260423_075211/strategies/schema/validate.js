const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, strict: false });

const schemaPath = path.join(__dirname, 'strategy_schema_v1.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validateStrategy = ajv.compile(schema);

function validate(strategyJsonPath) {
  const data = JSON.parse(fs.readFileSync(strategyJsonPath, 'utf8'));
  const valid = validateStrategy(data);
  if (!valid) {
    console.error(`Validation failed for ${strategyJsonPath}:`, validateStrategy.errors);
    return false;
  }
  return true;
}

module.exports = { validate, validateStrategy };
