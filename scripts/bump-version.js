#!/usr/bin/env node

/**
 * Auto-bump version script for production builds
 * Increments version in app.json before building
 * Usage: node scripts/bump-version.js [patch|minor|major]
 * Default: patch
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const bumpType = process.argv[2] || 'patch'; // patch, minor, or major

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error(`❌ Invalid bump type: ${bumpType}. Use: patch, minor, or major`);
  process.exit(1);
}

try {
  // Read app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const currentVersion = appJson.expo.version;

  // Parse version (assuming semver: major.minor.patch)
  const versionParts = currentVersion.split('.').map(Number);
  
  if (versionParts.length !== 3 || versionParts.some(isNaN)) {
    console.error(`❌ Invalid version format: ${currentVersion}. Expected format: X.Y.Z`);
    process.exit(1);
  }

  // Increment based on bump type
  switch (bumpType) {
    case 'major':
      versionParts[0] += 1;
      versionParts[1] = 0;
      versionParts[2] = 0;
      break;
    case 'minor':
      versionParts[1] += 1;
      versionParts[2] = 0;
      break;
    case 'patch':
    default:
      versionParts[2] += 1;
      break;
  }

  const newVersion = versionParts.join('.');

  // Update app.json
  appJson.expo.version = newVersion;
  appJson.expo.runtimeVersion = newVersion; // Also update runtimeVersion for OTA updates

  // Write back to app.json
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

  console.log(`✅ Version bumped (${bumpType}): ${currentVersion} → ${newVersion}`);
  console.log(`📝 Updated app.json`);
} catch (error) {
  console.error('❌ Error bumping version:', error.message);
  process.exit(1);
}

