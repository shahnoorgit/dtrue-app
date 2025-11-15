import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import VersionCheck from 'react-native-version-check';
import { logError, logMessage } from '@/utils/sentry/sentry';
import { trackApiError, trackAppError, trackForceUpdateRequired, trackUpdateCheck } from '@/lib/posthog/events';

type ForceUpdateState = {
  required: boolean;
  latestVersion: string | null;
  currentVersion: string | null;
  playStoreUrl: string | null;
  checking: boolean;
  error: string | null;
};

export function isVersionNewer(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map((n) => parseInt(n, 10));
  const currentParts = current.split('.').map((n) => parseInt(n, 10));
  const maxLen = Math.max(latestParts.length, currentParts.length);
  for (let i = 0; i < maxLen; i += 1) {
    const l = latestParts[i] ?? 0;
    const c = currentParts[i] ?? 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

/**
 * Check if user is 2+ minor versions behind (force update tolerance).
 * Examples:
 * - Latest: 1.0.3, Current: 1.0.1 → true (2 versions behind)
 * - Latest: 1.0.2, Current: 1.0.1 → false (only 1 version behind, allowed)
 * - Latest: 1.2.0, Current: 1.0.0 → true (2 minor versions behind)
 */
export function isVersionCriticallyOutdated(latest: string, current: string): boolean {
  const latestParts = latest.split('.').map((n) => parseInt(n, 10));
  const currentParts = current.split('.').map((n) => parseInt(n, 10));
  
  const [latestMajor = 0, latestMinor = 0, latestPatch = 0] = latestParts;
  const [currentMajor = 0, currentMinor = 0, currentPatch = 0] = currentParts;
  
  // Major version difference: always force
  if (latestMajor > currentMajor) return true;
  
  // Minor version difference >= 2: force
  if (latestMajor === currentMajor && latestMinor - currentMinor >= 2) return true;
  
  // Patch difference >= 2 (when major and minor are same): force
  if (latestMajor === currentMajor && latestMinor === currentMinor && latestPatch - currentPatch >= 2) return true;
  
  return false;
}

export function useForceUpdate(packageNameFromConfig?: string) {
  const [state, setState] = useState<ForceUpdateState>({
    required: false,
    latestVersion: null,
    currentVersion: null,
    playStoreUrl: null,
    checking: true,
    error: null,
  });

  const androidPackage = useMemo(() => {
    if (packageNameFromConfig) return packageNameFromConfig;
    // Best-effort to read from native app id
    return Application.applicationId ?? null;
  }, [packageNameFromConfig]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        if (__DEV__) {
          // Never block developer builds
          setState((s) => ({ ...s, checking: false }));
          return;
        }

        if (Platform.OS !== 'android') {
          setState((s) => ({ ...s, checking: false }));
          return;
        }

        const currentVersion = Application.nativeApplicationVersion ?? null;
        const packageName = androidPackage ?? undefined;

        // Helper: get latest version with simple retry
        const getLatestWithRetry = async (attempts = 2, delayMs = 1000): Promise<{ version: string | null; retryCount: number; }> => {
          let lastError: any = null;
          for (let i = 0; i < attempts; i += 1) {
            try {
              const v = await VersionCheck.getLatestVersion({ packageName });
              return { version: v ?? null, retryCount: i };
            } catch (err) {
              lastError = err;
              if (i < attempts - 1) {
                await new Promise((res) => setTimeout(res, delayMs));
              }
            }
          }
          throw lastError;
        };

        let latestVersion: string | null = null;
        let retryCount = 0;
        try {
          const result = await getLatestWithRetry(2, 1000);
          latestVersion = result.version;
          retryCount = result.retryCount;
        } catch (err: any) {
          const errorMessage = err?.message ?? 'Failed to fetch latest version from store';
          trackApiError({ endpoint: 'play_store_version', error: errorMessage, retryCount: 1 });
          logError(err, { context: 'useForceUpdate.getLatestVersion', packageName, retryCount: 1 });
        }

        let playStoreUrl: string | null = null;
        try {
          const url = await VersionCheck.getStoreUrl({ packageName });
          playStoreUrl = url ?? null;
        } catch (err: any) {
          const errorMessage = err?.message ?? 'Failed to resolve store URL';
          trackApiError({ endpoint: 'play_store_url', error: errorMessage });
          logError(err, { context: 'useForceUpdate.getStoreUrl', packageName });
        }

        // Force update if user is on any version older than the latest (no tolerance)
        const required = !!(latestVersion && currentVersion && isVersionNewer(latestVersion, currentVersion));

        // Telemetry for successful check
        trackUpdateCheck({
          packageName: androidPackage,
          currentVersion,
          latestVersion,
          required,
          reason: required ? 'store_version' : 'none',
          retryCount,
        });
        logMessage('Force update check completed', 'info', {
          packageName,
          currentVersion,
          latestVersion,
          required,
        });

        if (required) {
          trackForceUpdateRequired({
            packageName: androidPackage,
            currentVersion: currentVersion ?? undefined,
            latestVersion: latestVersion ?? undefined,
            reason: 'store_version',
          });
        }

        if (!cancelled) {
          setState({
            required,
            latestVersion: latestVersion ?? null,
            currentVersion,
            playStoreUrl,
            checking: false,
            error: null,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            checking: false,
            error: e?.message ?? 'Failed to check store version',
          }));
        }
        trackAppError({ error: e?.message ?? 'Force update check failed', component: 'useForceUpdate', severity: 'low' });
        logError(e, { context: 'useForceUpdate.root', tags: { component: 'useForceUpdate' } });
      }
    }

    check();
    return () => { cancelled = true; };
  }, [androidPackage]);

  return state;
}


