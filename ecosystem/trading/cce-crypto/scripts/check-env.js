const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
console.log(`\n🔍 Checking .env at: ${envPath}`);

if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    process.exit(1);
}

const buffer = fs.readFileSync(envPath);
console.log(`   File size: ${buffer.length} bytes`);

// Check for UTF-16 BOM (Common PowerShell issue)
if (buffer.length >= 2) {
    if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        console.error('\n❌ CRITICAL ERROR: File is UTF-16 LE (PowerShell encoding).');
        console.error('   Node.js cannot read this.');
        console.error('   👉 FIX: Open .env in Notepad -> "Save As" -> Select "UTF-8" in the encoding dropdown.');
        process.exit(1);
    }
}

console.log('✅ Encoding looks correct (UTF-8/ASCII).');

console.log('\n--- Content Preview (Keys Only) ---');
const content = buffer.toString('utf8');
let foundGemini = false;

content.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        if (key && !key.startsWith('#')) {
            console.log(`   Found Key: ${key}`);
            if (key === 'GEMINI_API_KEY') foundGemini = true;
        }
    }
});

if (foundGemini) {
    console.log('\n✅ GEMINI_API_KEY is present in the file.');
} else {
    console.error('\n❌ GEMINI_API_KEY was NOT found in the file content.');
}