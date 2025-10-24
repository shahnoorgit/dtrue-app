# PostHog Event Tracking System

## Overview

This directory contains the streamlined PostHog event tracking system for the Dtrue debate app. The system has been designed to focus on high-value user behaviors that drive business insights while staying within PostHog's free tier limits.

## Key Principles

- **Quality over Quantity**: 20 focused events instead of 58+ granular events
- **Action-Oriented**: Events track meaningful user actions, not UI interactions
- **Type-Safe**: Full TypeScript support with comprehensive interfaces
- **Business-Focused**: Events that directly impact user acquisition, engagement, and retention
- **Privacy-Conscious**: Automatic PII redaction and data sanitization

## Event Categories

### 1. User Acquisition & Onboarding (4 events)

#### `user_signed_up`
**Purpose**: Track new user registrations
**Properties**:
- `email` (string, optional): User's email (automatically redacted)
- `method` (string, optional): Sign-up method (e.g., 'email')

**Usage**:
```typescript
import { trackUserSignedUp } from '@/lib/posthog/events';

trackUserSignedUp({
  email: user.email,
  method: 'email'
});
```

#### `user_signed_in`
**Purpose**: Track user sign-ins (retention metric)
**Properties**:
- `email` (string, optional): User's email (automatically redacted)
- `method` (string, optional): Sign-in method (e.g., 'email')

**Usage**:
```typescript
import { trackUserSignedIn } from '@/lib/posthog/events';

trackUserSignedIn({
  email: user.email,
  method: 'email'
});
```

#### `onboarding_completed`
**Purpose**: Track successful onboarding completion
**Properties**:
- `hasProfileImage` (boolean, optional): Whether user uploaded a profile image
- `username` (string, optional): Chosen username
- `timeToComplete` (number, optional): Time taken to complete onboarding in milliseconds

**Usage**:
```typescript
import { trackOnboardingCompleted } from '@/lib/posthog/events';

trackOnboardingCompleted({
  hasProfileImage: !!profileImageUrl,
  username: username,
  timeToComplete: Date.now() - onboardingStartTime
});
```

#### `onboarding_abandoned`
**Purpose**: Track users who leave during onboarding
**Properties**:
- `step` (number, optional): Which step they abandoned
- `reason` (string, optional): Reason for abandonment (e.g., 'skipped')

**Usage**:
```typescript
import { trackOnboardingAbandoned } from '@/lib/posthog/events';

trackOnboardingAbandoned({
  step: currentIndex,
  reason: 'skipped'
});
```

### 2. Debate Creation & Management (4 events)

#### `debate_created`
**Purpose**: Track successful debate creation
**Properties**:
- `debateId` (string, required): Unique debate identifier
- `title` (string, optional): Debate title
- `duration` (number, optional): Debate duration in hours
- `hasImage` (boolean, optional): Whether debate has an image
- `descriptionLength` (number, optional): Length of debate description

**Usage**:
```typescript
import { trackDebateCreated } from '@/lib/posthog/events';

trackDebateCreated({
  debateId: data.data.id,
  title: title,
  duration: selectedDuration,
  hasImage: !!imageUrl,
  descriptionLength: description.length
});
```

#### `debate_creation_failed`
**Purpose**: Track failed debate creation attempts
**Properties**:
- `error` (string, optional): Error message
- `step` (string, optional): Which step failed (e.g., 'api_call')
- `statusCode` (number, optional): HTTP status code

**Usage**:
```typescript
import { trackDebateCreationFailed } from '@/lib/posthog/events';

trackDebateCreationFailed({
  error: err.message,
  step: 'api_call',
  statusCode: err.response?.status
});
```

#### `debate_joined`
**Purpose**: Track when users join debates
**Properties**:
- `debateId` (string, required): Unique debate identifier
- `source` (string, optional): Where they joined from ('feed', 'explore', 'trending', 'profile', 'share', 'direct')
- `debateTitle` (string, optional): Debate title

**Usage**:
```typescript
import { trackDebateJoined } from '@/lib/posthog/events';

trackDebateJoined({
  debateId: debate.id,
  source: 'feed',
  debateTitle: debate.title
});
```

#### `debate_ended`
**Purpose**: Track when debates conclude
**Properties**:
- `debateId` (string, required): Unique debate identifier
- `reason` (string, optional): How it ended ('timeout', 'completed', 'cancelled')
- `participantCount` (number, optional): Number of participants
- `opinionCount` (number, optional): Number of opinions submitted

**Usage**:
```typescript
import { trackDebateEnded } from '@/lib/posthog/events';

trackDebateEnded({
  debateId: debate.id,
  reason: 'timeout',
  participantCount: participants.length,
  opinionCount: opinions.length
});
```

### 3. Debate Participation (3 events)

#### `opinion_submitted`
**Purpose**: Track when users submit their opinions
**Properties**:
- `debateId` (string, required): Unique debate identifier
- `stance` (string, required): User's stance ('for' or 'against')
- `opinionLength` (number, optional): Length of opinion text
- `hasEvidence` (boolean, optional): Whether opinion includes evidence

**Usage**:
```typescript
import { trackOpinionSubmitted } from '@/lib/posthog/events';

trackOpinionSubmitted({
  debateId: debateId,
  stance: 'for',
  opinionLength: userOpinion.length,
  hasEvidence: userOpinion.length > 50
});
```

#### `opinion_liked`
**Purpose**: Track when users like others' opinions
**Properties**:
- `debateId` (string, required): Unique debate identifier
- `likedUserId` (string, required): ID of user who liked (automatically redacted)
- `opinionAuthorId` (string, required): ID of opinion author (automatically redacted)

**Usage**:
```typescript
import { trackOpinionLiked } from '@/lib/posthog/events';

trackOpinionLiked({
  debateId: debateId,
  likedUserId: userId,
  opinionAuthorId: opinion.userId
});
```

#### `debate_abandoned`
**Purpose**: Track when users leave debates before completion
**Properties**:
- `debateId` (string, required): Unique debate identifier
- `timeSpent` (number, optional): Time spent in debate in milliseconds
- `hadSubmittedOpinion` (boolean, optional): Whether they submitted an opinion
- `reason` (string, optional): Reason for leaving

**Usage**:
```typescript
import { trackDebateAbandoned } from '@/lib/posthog/events';

trackDebateAbandoned({
  debateId: debateId,
  timeSpent: Date.now() - joinTime,
  hadSubmittedOpinion: !!userOpinion,
  reason: 'navigation'
});
```

### 4. Social & Viral Actions (3 events)

#### `content_shared`
**Purpose**: Track when users share content
**Properties**:
- `type` (string, required): Type of content ('debate' or 'profile')
- `contentId` (string, required): ID of shared content
- `method` (string, optional): Sharing method ('native' or 'link')
- `platform` (string, optional): Platform shared to

**Usage**:
```typescript
import { trackContentShared } from '@/lib/posthog/events';

trackContentShared({
  type: 'debate',
  contentId: debate.id,
  method: 'native'
});
```

#### `profile_viewed`
**Purpose**: Track when users view profiles
**Properties**:
- `profileId` (string, required): ID of viewed profile (automatically redacted)
- `source` (string, optional): Where they viewed from ('explore', 'debate', 'followers', 'following', 'share', 'own_profile')
- `isOwnProfile` (boolean, optional): Whether viewing own profile

**Usage**:
```typescript
import { trackProfileViewed } from '@/lib/posthog/events';

trackProfileViewed({
  profileId: profile.id,
  source: 'explore',
  isOwnProfile: profile.id === userId
});
```

#### `user_followed`
**Purpose**: Track when users follow others
**Properties**:
- `followedUserId` (string, required): ID of followed user (automatically redacted)
- `source` (string, optional): Where they followed from ('profile', 'explore', 'debate')

**Usage**:
```typescript
import { trackUserFollowed } from '@/lib/posthog/events';

trackUserFollowed({
  followedUserId: user.id,
  source: 'profile'
});
```

### 5. App Usage & Retention (3 events)

#### `app_opened`
**Purpose**: Track app launches (daily active user metric)
**Properties**:
- `launchSource` (string, optional): How app was launched ('cold_start', 'notification', 'deep_link')
- `isSignedIn` (boolean, optional): Whether user is signed in
- `platform` (string, optional): Platform (iOS/Android)

**Usage**:
```typescript
import { trackAppOpened } from '@/lib/posthog/events';

trackAppOpened({
  launchSource: 'cold_start',
  isSignedIn: true,
  platform: Platform.OS
});
```

#### `search_performed`
**Purpose**: Track when users search for content
**Properties**:
- `query` (string, required): Search query
- `type` (string, optional): Search type ('debates' or 'profiles')
- `resultsCount` (number, optional): Number of results returned

**Usage**:
```typescript
import { trackSearchPerformed } from '@/lib/posthog/events';

trackSearchPerformed({
  query: searchQuery,
  type: 'debates',
  resultsCount: results.length
});
```

#### `deep_link_opened`
**Purpose**: Track when users open shared links
**Properties**:
- `path` (string, required): Deep link path
- `source` (string, optional): Source of link ('notification', 'share', 'external')
- `destination` (string, optional): Where link leads ('debate', 'profile', 'trending')

**Usage**:
```typescript
import { trackDeepLinkOpened } from '@/lib/posthog/events';

trackDeepLinkOpened({
  path: '/debate/123',
  source: 'external',
  destination: 'debate'
});
```

### 6. Error & System (3 events)

#### `app_error`
**Purpose**: Track critical app errors
**Properties**:
- `error` (string, required): Error message
- `component` (string, optional): Component where error occurred
- `severity` (string, optional): Error severity ('low', 'medium', 'high')

**Usage**:
```typescript
import { trackAppError } from '@/lib/posthog/events';

trackAppError({
  error: error.message,
  component: 'ErrorBoundary',
  severity: 'high'
});
```

#### `api_error`
**Purpose**: Track API failures
**Properties**:
- `endpoint` (string, optional): API endpoint that failed
- `statusCode` (number, optional): HTTP status code
- `error` (string, optional): Error message
- `retryCount` (number, optional): Number of retry attempts

**Usage**:
```typescript
import { trackApiError } from '@/lib/posthog/events';

trackApiError({
  endpoint: 'user-status',
  statusCode: 500,
  error: 'Internal server error'
});
```

#### `user_logged_out`
**Purpose**: Track when users sign out
**Properties**:
- `sessionDuration` (number, optional): Session duration in milliseconds
- `reason` (string, optional): Reason for logout ('manual', 'expired', 'error')

**Usage**:
```typescript
import { trackUserLoggedOut } from '@/lib/posthog/events';

trackUserLoggedOut({
  reason: 'manual'
});
```

## Utility Functions

### `identifyUser`
**Purpose**: Identify user in PostHog with safe properties
**Usage**:
```typescript
import { identifyUser } from '@/lib/posthog/events';

identifyUser(userId, {
  email: user.email,
  username: user.username,
  platform: Platform.OS
});
```

### `resetUser`
**Purpose**: Reset user identification (call on logout)
**Usage**:
```typescript
import { resetUser } from '@/lib/posthog/events';

resetUser();
```

## Data Privacy & Security

### Automatic PII Redaction
The system automatically redacts sensitive information:
- **Email addresses**: Replaced with `[REDACTED]`
- **User IDs**: Truncated to first 8 characters
- **Debate IDs**: Truncated to first 8 characters

### Error Handling
All event tracking functions include error handling to prevent app crashes:
- Failed events are logged to console with warnings
- App continues to function even if PostHog is unavailable
- No user data is lost due to tracking failures

## Analytics Funnels

### Acquisition Funnel
1. `app_opened` → `user_signed_up` → `onboarding_completed` → `debate_joined`

### Engagement Funnel
1. `debate_joined` → `opinion_submitted` → `opinion_liked` → `debate_ended`

### Retention Funnel
1. `app_opened` → `search_performed` → `debate_joined` → `content_shared`

### Viral Growth Funnel
1. `content_shared` → `deep_link_opened` → `user_signed_up` → `debate_joined`

## PostHog Free Tier Optimization

- **Total Events**: 20 (well within free tier limits)
- **Event Volume**: Optimized for meaningful insights without overwhelming data
- **Property Efficiency**: Rich context without excessive data points
- **Cost Effective**: Maximum value from free tier allocation

## Migration Notes

### Removed Events
The following low-value events were removed during refactoring:
- All `page_viewed` events (20+ instances)
- All `posthog.screen()` calls (20+ instances)
- Button click events (`debate_header_tapped`, etc.)
- System log events (`image_upload_initiated`, `push.permission`)
- Refresh action events (`Refreshed Explore Debates`)
- Navigation events (`onboarding_next`)

### Rationale for Removal
- **Page views**: Not actionable insights, just noise
- **Button clicks**: Too granular, not meaningful for business decisions
- **System logs**: Technical events, not user behavior
- **Refresh actions**: UI interactions, not business metrics
- **Navigation events**: Too granular for funnel analysis

## Best Practices

### When to Add New Events
Only add new events if they:
1. **Drive business decisions**: Help understand user behavior that impacts growth
2. **Are actionable**: Provide insights that can lead to product improvements
3. **Fit the funnel**: Contribute to understanding user journeys
4. **Stay within limits**: Don't exceed PostHog free tier constraints

### Event Naming Convention
- Use **action-oriented** names (e.g., `user_signed_up` not `sign_up_initiated`)
- Use **snake_case** for consistency
- Be **descriptive** but **concise**
- Avoid **technical jargon** in event names

### Property Guidelines
- Include **relevant context** without being excessive
- Use **consistent data types** across similar events
- **Redact sensitive data** automatically
- Provide **optional properties** with sensible defaults

## Troubleshooting

### Common Issues

#### Type Errors
If you encounter TypeScript errors:
1. Check that you're using the correct property types
2. Ensure required properties are provided
3. Verify optional properties have correct types

#### Missing Events
If events aren't appearing in PostHog:
1. Check console for error messages
2. Verify PostHog API key is configured
3. Ensure network connectivity
4. Check if events are being called correctly

#### Performance Issues
If tracking impacts app performance:
1. Events are designed to be lightweight
2. Error handling prevents blocking
3. Consider reducing event frequency if needed

## Support

For questions or issues with the PostHog event system:
1. Check this documentation first
2. Review the event definitions in `events.ts`
3. Test events in development environment
4. Monitor PostHog dashboard for event delivery

---

**Last Updated**: December 2024
**Version**: 2.0 (Refactored)
**Total Events**: 20
**PostHog Free Tier**: Optimized
