# Issue Priority/Urgency System Added ✅

## What Was Added

A visual priority system that marks issues based on their urgency (upvote count) to help users and workers identify critical issues quickly.

## Priority Levels

### 🔴 CRITICAL (Dangerous)
- **Trigger:** 10 or more upvotes
- **Color:** Red badge with red dot
- **Meaning:** Highly urgent issue affecting many people
- **Action:** Workers should prioritize these first

### 🟡 MODERATE
- **Trigger:** 5-9 upvotes
- **Color:** Yellow badge with yellow dot
- **Meaning:** Important issue with moderate community impact
- **Action:** Should be addressed soon

### 🟢 MINOR
- **Trigger:** Less than 5 upvotes
- **Color:** Green badge with green dot
- **Meaning:** Lower priority issue
- **Action:** Can be addressed after critical/moderate issues

## Visual Implementation

### On Issue Cards (IssueCard.tsx):
#### With Images:
- **Category badge:** Top-left corner (e.g., "Water", "Trash")
- **Priority badge:** Top-right corner (e.g., "Dangerous", "Moderate", "Minor")
- **Image counter:** Bottom-right (if multiple images)

#### Without Images:
- **Category badge:** Top-left of content area
- **Priority badge:** Top-right of content area

### On Issue Detail Page (IssueDetail.tsx):
- **Status badge:** Next to issue title (e.g., "Resolved", "In Progress")
- **Priority badge:** Next to status badge showing urgency level

### On Featured Issues (FeaturedIssue.tsx):
- **Category badge:** Top-left of overlay content
- **Priority badge:** Next to category badge with colored dot indicator

## How It Works

The priority is calculated automatically based on the upvote count:

```typescript
if (upvotes >= 10) → CRITICAL (Red)
else if (upvotes >= 5) → MODERATE (Yellow)
else → MINOR (Green)
```

### Dynamic Updates
- Priority updates in real-time as users upvote/downvote
- Color changes automatically when thresholds are crossed
- No manual intervention needed

## Benefits

### For Citizens:
- ✅ Quickly identify which issues have community support
- ✅ See which problems are most urgent
- ✅ Understand issue severity at a glance

### For Workers:
- ✅ Prioritize work based on community needs
- ✅ Focus on critical issues first
- ✅ Better resource allocation
- ✅ Clear visual indicators for urgency

### For Administrators:
- ✅ Monitor issue severity across the system
- ✅ Identify trending problems quickly
- ✅ Allocate resources to critical areas
- ✅ Track community engagement

## Examples

### Critical Issue (10+ upvotes):
```
🔴 Dangerous
"Major water pipe burst on Main Street"
15 upvotes → Red badge
```

### Moderate Issue (5-9 upvotes):
```
🟡 Moderate
"Broken streetlight on Park Avenue"
7 upvotes → Yellow badge
```

### Minor Issue (< 5 upvotes):
```
🟢 Minor
"Small pothole on Elm Street"
2 upvotes → Green badge
```

## Technical Details

### Files Modified:
- `src/components/IssueCard.tsx` - Added priority system to issue cards
- `src/pages/IssueDetail.tsx` - Added priority badge to issue detail page
- `src/components/FeaturedIssue.tsx` - Added priority badge to featured issues

### Code Added:
```typescript
const getPriorityLevel = (upvoteCount: number) => {
  if (upvoteCount >= 10) {
    return {
      level: 'CRITICAL',
      color: 'bg-red-100 text-red-700 border-red-300',
      dotColor: 'bg-red-500',
      label: 'Dangerous'
    };
  } else if (upvoteCount >= 5) {
    return {
      level: 'MODERATE',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      dotColor: 'bg-yellow-500',
      label: 'Moderate'
    };
  } else {
    return {
      level: 'MINOR',
      color: 'bg-green-100 text-green-700 border-green-300',
      dotColor: 'bg-green-500',
      label: 'Minor'
    };
  }
};
```

### No Breaking Changes:
- ✅ All existing functionality preserved
- ✅ No database changes required
- ✅ No API changes needed
- ✅ Backward compatible
- ✅ Works with existing upvote system

## Customization

If you want to adjust the thresholds, edit the `getPriorityLevel` function:

```typescript
// Current thresholds:
>= 10 upvotes → Critical
>= 5 upvotes → Moderate
< 5 upvotes → Minor

// To change (example):
>= 20 upvotes → Critical
>= 10 upvotes → Moderate
< 10 upvotes → Minor
```

## Testing

### Test Scenarios:
1. **Create issue with 0 upvotes** → Should show green "Minor" badge
2. **Upvote to 5** → Should change to yellow "Moderate" badge
3. **Upvote to 10** → Should change to red "Dangerous" badge
4. **Remove upvotes** → Should downgrade priority accordingly

### Visual Check:
- [ ] Priority badge visible on all issue cards
- [ ] Colors match urgency level
- [ ] Badge doesn't overlap with other elements
- [ ] Works on mobile and desktop
- [ ] Updates when upvote count changes

## Future Enhancements

Possible additions:
- [ ] Add priority filter (show only critical issues)
- [ ] Sort by priority
- [ ] Priority notifications for workers
- [ ] Priority-based assignment
- [ ] Dashboard showing priority distribution
- [ ] Time-based urgency (older issues get higher priority)

## User Guide

### For Citizens:
Look for the colored badge on each issue:
- 🔴 Red = Very urgent, many people affected
- 🟡 Yellow = Important, needs attention
- 🟢 Green = Lower priority

Upvote issues you care about to increase their priority!

### For Workers:
Focus on:
1. Red (Dangerous) issues first
2. Yellow (Moderate) issues next
3. Green (Minor) issues when time permits

The system helps you prioritize your work based on community needs.

---

**Status:** ✅ Implemented and ready to use
**Impact:** Better prioritization for workers and citizens
**Next:** Test the priority badges on the Issues page