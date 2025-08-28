// generate-version.js
const fs = require('fs');
const { execSync } = require('child_process');
const pkg = require('./package.json');

const version = pkg.version;

// ✅ Prefer Railway env var if available
let commitHash = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown';

// ✅ Fallback to local git (for dev)
if (commitHash === 'unknown') {
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    console.warn('⚠️ No git commit found, using "unknown"');
  }
}

const buildTime = new Date().toISOString();

const versionInfo = {
  version,
  commit: commitHash,
  buildTime
};

fs.writeFileSync('./public/version.json', JSON.stringify(versionInfo, null, 2));
console.log('✅ Version file generated:', versionInfo);
