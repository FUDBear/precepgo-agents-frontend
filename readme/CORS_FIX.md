# CORS Configuration Guide

## Problem

The frontend is receiving CORS errors when trying to connect to the backend API. The backend needs to be configured to allow requests from the frontend's origin.

## Current Frontend URL

Your deployed frontend URL is:
```
https://precepgo-adk-frontend-g4y4qz5rfa-uc.a.run.app
```

## Backend Fix Required

The backend FastAPI application needs to be updated to allow CORS from the frontend origin.

### Update Backend CORS Settings

In your backend `main.py` file, update the CORS middleware configuration:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://precepgo-adk-frontend-g4y4qz5rfa-uc.a.run.app",  # Your frontend URL
        "http://localhost:5173",  # Local development
        "http://localhost:3000",  # Alternative local port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Or Allow All Origins (For Development Only)

If you want to allow all origins during development:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (NOT recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Recommended Production Configuration

For production, explicitly list allowed origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://precepgo-adk-frontend-g4y4qz5rfa-uc.a.run.app",
        # Add any other frontend URLs here
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

## Steps to Fix

1. **Update backend code** with the CORS configuration above
2. **Rebuild and redeploy** the backend to Cloud Run:
   ```bash
   # Navigate to backend directory
   cd /path/to/backend
   
   # Deploy updated backend
   gcloud run deploy precepgo-adk-panel \
     --source . \
     --region us-central1 \
     --allow-unauthenticated
   ```

3. **Verify the fix** by checking the frontend - the CORS error banner should disappear

## Testing

After updating the backend, test the connection:

```bash
# Test from frontend origin
curl -H "Origin: https://precepgo-adk-frontend-g4y4qz5rfa-uc.a.run.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://precepgo-adk-panel-724021185717.us-central1.run.app/health \
     -v
```

You should see `Access-Control-Allow-Origin` header in the response.

## Frontend Changes Made

The frontend has been updated to:
- Better handle CORS errors with clear error messages
- Display a CORS error banner when detected
- Show the exact origin that needs to be allowed

Once the backend is updated, the frontend will automatically reconnect.

