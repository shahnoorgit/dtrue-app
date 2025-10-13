# Manual Migration Guide for 10 Existing Users

## 🎯 Overview

Since you only have 10 users, we've removed the automatic migration logic. You'll manually set the `unsafeMetadata.onboarded` flag for each existing user.

---

## 📋 Two Options to Set Metadata

### **Option 1: Via Clerk Dashboard (Easiest)**

1. **Go to Clerk Dashboard:**
   - Navigate to https://dashboard.clerk.com
   - Select your application
   - Go to "Users" section

2. **For Each User:**
   - Click on the user
   - Go to the "Metadata" tab
   - Find "Unsafe metadata" section
   - Click "Edit"
   - Add this JSON:
   ```json
   {
     "onboarded": true,
     "onboardedAt": 1697123456789
   }
   ```
   - Click "Save"

3. **Repeat for all 10 users**

---

### **Option 2: Via Clerk Backend API (Bulk Update)**

If you want to do it programmatically, here's a Node.js script:

```javascript
// update-users-metadata.js
import { clerkClient } from '@clerk/clerk-sdk-node';

// Your Clerk Secret Key (from dashboard)
const CLERK_SECRET_KEY = 'sk_live_...'; // Replace with your secret key

async function updateAllUsersMetadata() {
  try {
    // Get all users
    const users = await clerkClient.users.getUserList();
    
    console.log(`Found ${users.length} users`);
    
    for (const user of users) {
      // Check if user already has onboarded metadata
      if (user.unsafeMetadata?.onboarded !== undefined) {
        console.log(`✓ User ${user.id} already has metadata, skipping`);
        continue;
      }
      
      // Update user metadata
      await clerkClient.users.updateUser(user.id, {
        unsafeMetadata: {
          onboarded: true,
          onboardedAt: Date.now(),
          migratedManually: true,
        },
      });
      
      console.log(`✓ Updated user ${user.id} (${user.emailAddresses[0]?.emailAddress})`);
    }
    
    console.log('\n✅ All users updated successfully!');
  } catch (error) {
    console.error('❌ Error updating users:', error);
  }
}

updateAllUsersMetadata();
```

**To run:**
```bash
npm install @clerk/clerk-sdk-node
node update-users-metadata.js
```

---

## ✅ Verification

After updating metadata, verify each user:

### **Method 1: Clerk Dashboard**
1. Go to Users → Select user → Metadata tab
2. Check "Unsafe metadata" shows `onboarded: true`

### **Method 2: Test Login**
1. Sign in as one of the updated users
2. Should go directly to main app (/(tabs))
3. Check console logs:
   ```
   [NAVIGATOR] onboarded: true
   [NAVIGATION] User onboarded, navigating to tabs
   ```

---

## 🎯 What Should Each User's Metadata Look Like?

**For existing users (who have already completed onboarding):**
```json
{
  "onboarded": true,
  "onboardedAt": 1697123456789
}
```

**For new users (after onboarding):**
```json
{
  "onboarded": true,
  "onboardedAt": 1697123456789
}
```

**For users who haven't onboarded yet:**
```json
{
  "onboarded": false
}
```
Or leave metadata undefined - they'll be sent to onboarding automatically.

---

## 📝 Steps After Manual Migration

1. ✅ Update all 10 users' metadata (via dashboard or script)
2. ✅ Deploy the updated app code
3. ✅ Test with one user to verify routing works
4. ✅ Monitor logs for any issues

---

## 🔍 How to Check if a User Needs Migration

### Query your database:
```sql
-- Get all users who exist in your DB
SELECT clerkId, email, username FROM users;
```

### Then for each clerkId:
1. Check in Clerk Dashboard if they have `unsafeMetadata.onboarded`
2. If **undefined** or **false**, set it to **true**
3. If they're in your DB, they've completed onboarding

---

## ⚡ Quick Checklist

For each of the 10 users:
- [ ] User exists in your database? → Set `onboarded: true`
- [ ] User doesn't exist in DB? → Set `onboarded: false` (or leave undefined)
- [ ] Verify metadata in Clerk Dashboard
- [ ] Test login to confirm routing

---

## 🆘 Troubleshooting

### **User gets stuck on onboarding screen**
- Check their metadata: Should be `onboarded: true`
- Check your database: User record should exist
- Check console logs for routing decision

### **User keeps going to sign-in**
- They might not have metadata set
- Set `unsafeMetadata.onboarded: true` in Clerk Dashboard

### **App crashes on launch**
- Check console for errors
- Verify all migration code was removed properly
- Ensure no references to removed functions

---

## 📊 Expected Results After Migration

| User Type | Metadata | Behavior |
|-----------|----------|----------|
| Existing (in DB) | `onboarded: true` | → Main app /(tabs) |
| New signup | Set during onboarding | → Main app /(tabs) |
| Not onboarded | `undefined` or `false` | → Onboarding screen |

---

## 🎯 Summary

**Migration removed:** ✅
- ❌ No automatic DB checks
- ❌ No migration useEffect
- ❌ No background sync
- ❌ No AsyncStorage migration tracking

**What remains:** ✅
- ✅ Simple metadata-based routing
- ✅ Onboarding sets metadata
- ✅ Push token registration
- ✅ Clean, simple code

**Your action:** 
1. Manually set metadata for 10 users
2. Deploy code
3. Done!

**Time estimate:** ~5-10 minutes total

