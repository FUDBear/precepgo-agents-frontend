# Frontend Verification Checklist

## ✅ Verified Frontend Configuration

### Agent Names (All Correct with Underscores)
- ✅ `notification_agent` (Safety Agent)
- ✅ `scenario_agent` (Scenario Agent)
- ✅ `evaluation_agent` (Evaluation Agent)
- ✅ `coa_agent` (COA Agent)

### API Base URL
- ✅ Base URL: `https://precepgo-adk-panel-724021185717.us-central1.run.app`
- ✅ Environment variable: `VITE_API_URL` (falls back to hardcoded URL)

### Endpoint URLs (Verified)
- ✅ `/agents/{agent_name}/status` - Uses underscores correctly
- ✅ `/agents/evaluation/create-demo` - Correct path
- ✅ `/mentor/make-scenario` - Correct path
- ✅ `/agents/notification/safety-check` - Correct path
- ✅ `/agents/coa-compliance/generate-reports` - Correct path
- ✅ `/agents/automated-mode/start` - Correct path
- ✅ `/agents/automated-mode/stop` - Correct path
- ✅ `/agents/automated-mode/status` - Correct path

## 🔍 Debugging Steps

### 1. Check Browser Console
Open DevTools → Console tab and look for:
- `[API] GET/POST` logs showing the exact URLs being called
- Any error messages with details

### 2. Check Network Tab
1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for failed requests (red status)
4. Check:
   - **Request URL** - Should match exactly
   - **Status Code** - Should be 200, not 404
   - **Response Headers** - Should include CORS headers
   - **Response** - Should be JSON, not HTML

### 3. Verify Environment Variables
In production, check Cloud Run environment variables:
```bash
gcloud run services describe precepgo-adk-frontend \
  --region us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

Should show:
```
VITE_API_URL=https://precepgo-adk-panel-724021185717.us-central1.run.app
```

### 4. Test API Directly
Run these commands to verify endpoints work:

```bash
# Test health
curl https://precepgo-adk-panel-724021185717.us-central1.run.app/health

# Test agent status (using underscore!)
curl https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/evaluation_agent/status

# Test automated mode status
curl https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/automated-mode/status
```

### 5. Common Issues & Fixes

#### Issue: 404 Errors
**Check:**
- Trailing slashes? (Should NOT have trailing slash)
- Correct agent name? (Must use underscores: `evaluation_agent`, not `evaluation-agent`)
- Correct base URL? (Verify in browser console logs)

**Fix:**
- Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Hard refresh the page
- Check Network tab for exact URL being called

#### Issue: CORS Errors
**Check:**
- Frontend origin is in backend's allowed origins
- Backend CORS middleware is configured

**Fix:**
- See `CORS_FIX.md` for backend configuration
- Verify frontend URL: `https://precepgo-adk-frontend-g4y4qz5rfa-uc.a.run.app`

#### Issue: Environment Variable Not Set
**Check:**
- Cloud Run service has `VITE_API_URL` environment variable
- Build process includes environment variable

**Fix:**
```bash
gcloud run services update precepgo-adk-frontend \
  --region us-central1 \
  --update-env-vars "VITE_API_URL=https://precepgo-adk-panel-724021185717.us-central1.run.app"
```

## 🔧 Frontend Code Verification

### File: `src/services/api.ts`
- ✅ Base URL correct
- ✅ All endpoints use correct paths
- ✅ Agent names use underscores
- ✅ Debug logging added (shows in console)

### File: `src/App.tsx`
- ✅ Agent names use underscores: `notification_agent`, `scenario_agent`, `evaluation_agent`, `coa_agent`
- ✅ Status polling uses correct agent names
- ✅ Error handling in place

## 📊 Expected Request URLs

When working correctly, you should see these URLs in Network tab:

```
GET https://precepgo-adk-panel-724021185717.us-central1.run.app/health
GET https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/automated-mode/status
GET https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/notification_agent/status
GET https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/scenario_agent/status
GET https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/evaluation_agent/status
GET https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/coa_agent/status
POST https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/evaluation/create-demo
POST https://precepgo-adk-panel-724021185717.us-central1.run.app/mentor/make-scenario
POST https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/notification/safety-check
POST https://precepgo-adk-panel-724021185717.us-central1.run.app/agents/coa-compliance/generate-reports
```

## ✅ Quick Verification

Run this in browser console:
```javascript
// Check API base URL
console.log('API URL:', import.meta.env.VITE_API_URL || 'https://precepgo-adk-panel-724021185717.us-central1.run.app');

// Test health endpoint
fetch('https://precepgo-adk-panel-724021185717.us-central1.run.app/health')
  .then(r => r.json())
  .then(d => console.log('Health check:', d))
  .catch(e => console.error('Health check failed:', e));
```

