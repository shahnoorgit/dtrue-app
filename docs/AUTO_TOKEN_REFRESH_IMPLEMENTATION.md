# Automatic Token Refresh Implementation

## Overview
This document describes the automatic 401 error handling and token refresh implementation across the app. When any API call receives a 401 (Unauthorized) response, the token is automatically refreshed and the request is retried - no user intervention required.

## Problem Solved
Previously, users would see "401 retry" errors on the trending, explore, and feed tabs. They had to manually retry the request. Now, the app automatically:
1. Detects 401 errors
2. Refreshes the authentication token
3. Retries the failed request
4. Returns the result seamlessly

## Implementation

### 1. **Fetch-based APIs** (Trending & Explore tabs)

**File:** `utils/fetchWithAutoRetry.ts`

A centralized fetch utility that:
- Caches tokens for 4 minutes to avoid unnecessary fetches
- Automatically detects 401 responses
- Force refreshes the token using Clerk's `getToken()`
- Retries the request once with the new token
- Prevents infinite retry loops

**Hook:** `useFetchWithAutoRetry()`

**Updated Files:**
- `app/(tabs)/trending.tsx` - Uses `fetchWithToken` for fetching trending debates
- `app/(tabs)/explore.tsx` - Uses `fetchWithToken` for explore feed and search

### 2. **Axios-based APIs** (Feed/Index tab)

**File:** `utils/axiosInstance.ts`

An axios instance with interceptors that:
- **Request Interceptor:** Automatically adds fresh auth token to every request
- **Response Interceptor:** Catches 401 errors, refreshes token, and retries request
- Prevents infinite retry loops using a `_retry` flag

**Hook:** `useAuthAxios()`

**Updated Files:**
- `app/(tabs)/index.tsx` - Uses `authAxios` for feed and notification APIs

### 3. **Legacy Hook** (Already working)

**File:** `hook/api/useFetchWithToken..ts`

Updated to include the same 401 handling logic for backward compatibility.

## Code Examples

### Using fetchWithAutoRetry (for fetch-based calls)

```typescript
import { useFetchWithAutoRetry } from "@/utils/fetchWithAutoRetry";

const MyComponent = () => {
  const { fetchWithToken } = useFetchWithAutoRetry();

  const fetchData = async () => {
    try {
      const data = await fetchWithToken(
        `${process.env.EXPO_PUBLIC_BASE_URL}/endpoint`,
        {
          method: "GET",
        }
      );
      // Handle data
    } catch (error) {
      // Only catches errors after retry attempt
      console.error(error);
    }
  };
};
```

### Using authAxios (for axios-based calls)

```typescript
import { useAuthAxios } from "@/utils/axiosInstance";

const MyComponent = () => {
  const authAxios = useAuthAxios();

  const fetchData = async () => {
    try {
      const { data } = await authAxios.get("/endpoint");
      // Handle data
    } catch (error) {
      // Only catches errors after retry attempt
      console.error(error);
    }
  };
};
```

## Token Caching Strategy

Both implementations use a 4-minute cache for tokens:
- Reduces unnecessary token fetches
- Tokens are refreshed before they expire (Clerk tokens typically last 60 minutes)
- Cache is shared across all requests in the same implementation
- Cache is automatically cleared and refreshed on 401 errors

## Features

✅ **Automatic 401 Detection:** No manual retry buttons needed
✅ **Single Retry Logic:** Prevents infinite loops
✅ **Token Caching:** Reduces API calls and improves performance  
✅ **Clerk Integration:** Uses Clerk's JWT template system
✅ **AsyncStorage Sync:** Keeps AsyncStorage in sync for offline scenarios
✅ **Error Logging:** Failed attempts are logged to Sentry
✅ **Type Safety:** Full TypeScript support

## Error Handling

### Successful Flow
1. API request → 401 response
2. Log: "🔄 Token expired (401), refreshing and retrying..."
3. Refresh token via Clerk
4. Retry request with new token
5. Return successful response

### Failed Flow (after retry)
1. API request → 401 response
2. Refresh token via Clerk
3. Retry request → Still fails
4. Throw error to caller
5. User sees error message (can manually retry)

## Testing

To test the implementation:

1. **Simulate token expiration:**
   - Manually invalidate the token in AsyncStorage
   - Or wait for natural token expiration

2. **Expected behavior:**
   - Navigate to Trending/Explore/Feed tabs
   - Data loads automatically without 401 errors
   - Check console for "🔄 Token expired (401), refreshing and retrying..." message

3. **Verify retry logic:**
   - Network requests should show 2 calls for failed requests (original + retry)
   - Second call should have a fresh Bearer token

## Benefits

- **Better UX:** Users don't see authentication errors
- **Reduced Support:** Fewer "why do I see 401?" questions
- **Seamless:** Works transparently in the background
- **Maintainable:** Centralized logic, easy to update
- **Consistent:** Same behavior across fetch and axios APIs

## Migration Guide

### For new components:

**Fetch-based:**
```typescript
import { useFetchWithAutoRetry } from "@/utils/fetchWithAutoRetry";
const { fetchWithToken } = useFetchWithAutoRetry();
// Use fetchWithToken instead of raw fetch
```

**Axios-based:**
```typescript
import { useAuthAxios } from "@/utils/axiosInstance";
const authAxios = useAuthAxios();
// Use authAxios instead of raw axios
```

### For existing components:

Replace manual 401 handling:
```typescript
// ❌ OLD
if (response.status === 401) {
  await refreshToken();
  // retry logic...
}

// ✅ NEW
// Just use fetchWithToken or authAxios - it handles 401 automatically!
```

## Future Enhancements

Potential improvements:
- [ ] Add exponential backoff for retries
- [ ] Support multiple retry attempts (currently 1)
- [ ] Add token refresh queue to prevent concurrent refreshes
- [ ] Implement refresh token rotation
- [ ] Add analytics for token refresh events

## Troubleshooting

**Issue:** Still seeing 401 errors  
**Solution:** Check that you're using `fetchWithToken` or `authAxios`, not raw `fetch` or `axios`

**Issue:** Infinite retry loop  
**Solution:** The `isRetry` and `_retry` flags should prevent this. Check implementation.

**Issue:** Token not refreshing  
**Solution:** Verify Clerk's `getToken()` is working and JWT template name is correct in env variables

---

**Last Updated:** October 9, 2025  
**Author:** AI Assistant  
**Related Files:** 
- `utils/fetchWithAutoRetry.ts`
- `utils/axiosInstance.ts`
- `hook/api/useFetchWithToken..ts`

