# Duplicate Detection Feature - Debugging Guide

## Status: Enhanced with Debug Logging

The duplicate detection feature has been enhanced with comprehensive debug logging to help identify any issues.

## What Was Added

### Debug Logging in ReportIssue.tsx
- Logs when duplicate check starts
- Shows input parameters (description, location, coordinates, category)
- Logs image conversion status
- Shows duplicate check results
- Indicates whether modal should be shown
- Tracks submission flow

### Debug Logging in duplicateDetectionService.ts
- Logs service initialization
- Shows database query parameters
- Displays number of existing issues fetched
- Shows top match details when duplicates found
- Tracks similarity calculations

## How to Test

### 1. Open Browser Console
- Press F12 or right-click → Inspect
- Go to Console tab
- Clear console (Ctrl+L or Cmd+K)

### 2. Submit an Issue
When you submit an issue, you should see logs like:

```
🔍 Starting duplicate check...
Description: [your description]
Location: [your location]
Coordinates: {lat: X, lng: Y}
Category: [category]
🔍 Duplicate Detection Service - Starting check...
✅ Fetched X existing issues to check against
✅ Duplicate check complete. Found X potential duplicates.
```

### 3. Check for Duplicates
If duplicates are found with >60% confidence:
```
🚨 Showing duplicate modal
Top match: {id: "...", title: "...", similarity: "85%", matchType: "both"}
```

If no duplicates:
```
✅ No duplicates found, proceeding with submission
```

## Common Issues & Solutions

### Issue 1: No Existing Issues to Compare
**Symptom:** Log shows "Fetched 0 existing issues"
**Cause:** No issues in database from last 30 days
**Solution:** This is normal for new installations. Create a few test issues first.

### Issue 2: Coordinates Missing
**Symptom:** Log shows "Coordinates: null"
**Cause:** Location picker not providing coordinates
**Solution:** 
- Make sure Google Maps API key is set in `.env.local`
- Use the location picker to select a location on the map
- Check browser console for Google Maps errors

### Issue 3: Image Conversion Fails
**Symptom:** No "Image converted for duplicate check" log
**Cause:** Image upload or conversion issue
**Solution:**
- Check if images are properly uploaded
- Verify image file size (should be < 5MB)
- Check browser console for upload errors

### Issue 4: Modal Not Showing
**Symptom:** Duplicates found but modal doesn't appear
**Cause:** Confidence score below 60% threshold
**Solution:** Check the confidence score in logs. If it's below 0.6, the modal won't show (by design).

### Issue 5: Database Query Error
**Symptom:** "❌ Error fetching existing issues" in console
**Cause:** Supabase connection or RLS policy issue
**Solution:**
- Check Supabase connection in `.env.local`
- Verify RLS policies allow reading issues table
- Check network tab for failed requests

## Testing Scenarios

### Test 1: Create Duplicate Issue
1. Create an issue with specific location and description
2. Try to create another issue with:
   - Same location (within 100m)
   - Similar description
   - Same category
3. Expected: Duplicate modal should appear

### Test 2: Create Similar Issue (Different Location)
1. Create an issue at Location A
2. Create similar issue at Location B (>100m away)
3. Expected: May or may not show duplicate depending on text similarity

### Test 3: Create Different Issue (Same Location)
1. Create a "pothole" issue at Location A
2. Create a "streetlight" issue at same location
3. Expected: Should not show duplicate (different categories/descriptions)

## Thresholds

Current configuration:
- **Distance threshold:** 100 meters (0.1 km)
- **Similarity threshold:** 60% (0.6)
- **Time window:** 30 days
- **Max results shown:** 3 duplicates

## Expected Behavior

### When Duplicates Found (>60% confidence):
1. "Checking for duplicates..." toast appears
2. Duplicate modal shows with similar issues
3. User can:
   - View existing issue
   - Cancel submission
   - Proceed anyway

### When No Duplicates Found:
1. "Checking for duplicates..." toast appears
2. Issue submits directly
3. Success message shown

### When Duplicate Check Fails:
1. Error toast: "Duplicate check failed"
2. Issue submits anyway (graceful fallback)
3. User not blocked from reporting

## Monitoring Console Output

Look for these key indicators:

✅ **Working Correctly:**
```
🔍 Starting duplicate check...
✅ Fetched X existing issues to check against
✅ Duplicate check complete
```

❌ **Has Issues:**
```
❌ Error fetching existing issues
❌ Error checking for duplicates
❌ Error comparing images
```

## Next Steps

1. **Test the feature** by creating duplicate issues
2. **Check console logs** to see what's happening
3. **Report findings** with console output
4. **Adjust thresholds** if needed (in duplicateDetectionService.ts)

## Files Modified

- `src/pages/ReportIssue.tsx` - Added debug logging
- `src/services/duplicateDetectionService.ts` - Enhanced logging

## Need Help?

If the feature still isn't working:
1. Copy all console logs from a test submission
2. Check browser Network tab for failed API calls
3. Verify Supabase connection is working
4. Check if issues table has data to compare against
