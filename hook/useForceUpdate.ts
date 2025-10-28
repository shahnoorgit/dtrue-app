import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import VersionCheck from 'react-native-version-check';

type ForceUpdateState = {
  required: boolean;
  latestVersion: string | null;
  currentVersion: string | null;
  playStoreUrl: string | null;
  checking: boolean;
  error: string | null;
};

function isVersionNewer(latest: string, current: string): boolean {
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

        const latestVersion = await VersionCheck.getLatestVersion({
          packageName,
        });

        const playStoreUrl = await VersionCheck.getStoreUrl({
          packageName,
        });

        const required = !!(latestVersion && currentVersion && isVersionNewer(latestVersion, currentVersion));

        if (!cancelled) {
          setState({
            required,
            latestVersion: latestVersion ?? null,
            currentVersion,
            playStoreUrl: playStoreUrl ?? null,
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
      }
    }

    check();
    return () => { cancelled = true; };
  }, [androidPackage]);

  return state;
}


