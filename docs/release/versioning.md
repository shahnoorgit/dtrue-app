# Release Versioning Requirements (Android)

## Force Update Behavior

The app automatically shows a force-update screen when the user's installed version is **older than the Play Store version** (strict enforcement, no tolerance).

**Examples:**
- Play Store: `1.0.2`, User has: `1.0.1` → **Force update shown**
- Play Store: `1.0.1`, User has: `1.0.0` → **Force update shown**
- Play Store: `1.3.0`, User has: `1.2.9` → **Force update shown**
- Play Store: `2.0.0`, User has: `1.x.x` → **Force update shown**

## Release Checklist

Choose the appropriate command based on the type of release:

### Patch Release (bug fixes)
```bash
npm run build:production
# Example: 1.0.0 → 1.0.1
```

### Minor Release (new features)
```bash
npm run build:production-minor
# Example: 1.0.5 → 1.1.0
```

### Major Release (breaking changes)
```bash
npm run build:production-major
# Example: 1.5.2 → 2.0.0
```

Each command will:
1. **Auto-bump** the version in `app.json`
2. **Update** `runtimeVersion` for OTA updates
3. **Build** the production APK/AAB with EAS
4. **Auto-increment** the `versionCode` via EAS settings

## Notes

- **Strict enforcement:** Any version older than the Play Store version will trigger force update
- **iOS:** Not currently gated by this check (Android only)
- **Development:** Force-update gate never blocks in dev builds (`__DEV__`)


