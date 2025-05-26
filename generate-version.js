// generate-version.js
const fs = require('fs');
const { execSync } = require('child_process');
const pkg = require('./package.json');

const version = pkg.version;
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const buildTime = new Date().toISOString();

const versionInfo = {
  version,
  commit: commitHash,
  buildTime
};

fs.writeFileSync('./public/version.json', JSON.stringify(versionInfo, null, 2));
console.log('✅ Version file generated:', versionInfo);
