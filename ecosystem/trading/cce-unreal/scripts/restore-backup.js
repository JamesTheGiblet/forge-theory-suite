const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Setup console interface to keep window open
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const waitAndExit = (code = 0) => {
    console.log('\nPress Enter to exit...');
    rl.question('', () => {
        process.exit(code);
    });
};

console.log('================================================');
console.log('   CCE DATABASE RESTORE TOOL');
console.log('================================================');

// 1. Detect Environment & Paths
const isPkg = typeof process.pkg !== 'undefined';
const basePath = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const dataDir = path.join(basePath, 'data');
const targetDbPath = path.join(dataDir, 'cce-production.db');

// 2. Get Source File (Drag & Drop passes file as argument)
// argv[0] is executable, argv[1] is script, argv[2] is the dropped file
const sourcePath = process.argv[2];

if (!sourcePath) {
    console.error('\n❌ NO FILE DETECTED.');
    console.log('👉 Usage: Drag and drop your backup.db file onto this icon.');
    waitAndExit(1);
    return;
}

console.log(`\n📂 Source: ${path.basename(sourcePath)}`);
console.log(`🎯 Target: data/cce-production.db`);

// 3. Validation
if (!fs.existsSync(sourcePath)) {
    console.error('\n❌ Error: Source file does not exist.');
    waitAndExit(1);
    return;
}

// Check if it's actually a SQLite database (Magic Header: "SQLite format 3")
try {
    const fd = fs.openSync(sourcePath, 'r');
    const header = Buffer.alloc(16);
    fs.readSync(fd, header, 0, 16, 0);
    fs.closeSync(fd);

    if (!header.toString().startsWith('SQLite format 3')) {
        console.error('\n❌ Error: This is not a valid database file.');
        console.error('   (Header mismatch. Are you sure this is a .db file?)');
        waitAndExit(1);
        return;
    }
} catch (e) {
    console.error('\n❌ Error reading file header:', e.message);
    waitAndExit(1);
    return;
}

// 4. Execution
console.log('\n⚠️  WARNING: This will overwrite your current database.');
console.log('   Ensure the CCE Engine is STOPPED before continuing.');

rl.question('\nType "yes" to confirm restore: ', (answer) => {
    if (answer.trim().toLowerCase() !== 'yes') {
        console.log('\n🚫 Restore cancelled.');
        waitAndExit(0);
        return;
    }

    try {
        // Ensure data dir exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Backup existing DB if present
        if (fs.existsSync(targetDbPath)) {
            const backupName = `cce-production.backup.${Date.now()}.db`;
            const backupPath = path.join(dataDir, backupName);
            console.log(`\n📦 Backing up current DB to: ${backupName}`);
            fs.copyFileSync(targetDbPath, backupPath);
        }

        // Perform Restore
        console.log('🔄 Restoring database...');
        fs.copyFileSync(sourcePath, targetDbPath);

        console.log('\n✅ SUCCESS! Database restored.');
        console.log('   You can now restart the engine.');
    } catch (e) {
        console.error('\n❌ RESTORE FAILED:', e.message);
    }
    waitAndExit(0);
});