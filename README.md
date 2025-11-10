# PrecepGo Agents Frontend

Frontend web application for managing and monitoring AI agents. This React application provides a dashboard interface to control and monitor AI agents running on Google Cloud Run.

## 🚀 Features

- **Agent Dashboard** - Monitor and control multiple AI agents
- **Real-time Updates** - Live status updates via Firestore listeners
- **Scenario Viewer** - Interactive scenario cards with answer selection
- **Automated Mode** - Toggle automated agent execution
- **Time Savings Analytics** - Track time saved by agents
- **Export Reports** - Download COA and Site reports as Excel files

## 🛠️ Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Real-time database and authentication
- **Rive** - Interactive animations

## 📦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (for Firestore)
- Backend API endpoint

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/precepgo-agents-frontend.git
cd precepgo-agents-frontend

# Install dependencies
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
VITE_API_URL=https://your-api-url.run.app
```

**Note:** Firebase configuration is currently hardcoded in `src/config/firebase.ts`. For production, consider moving these to environment variables.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🚀 Deployment

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Deploy to Google Cloud Run

See `readme/FRONTEND_DEPLOYMENT_GUIDE.md` for detailed deployment instructions.

**Quick deploy:**
```bash
./deploy.sh
```

**Note:** Update the deployment script with your own Google Cloud project details.

## 🎮 Using the Agents

### Available Agents

1. **Safety Agent** (🛡️) - Runs safety checks on evaluations
2. **Scenario Agent** (🎬) - Generates training scenarios
3. **Evaluation Agent** (📊) - Creates demo evaluations
4. **COA Agent** (🗺️) - Generates COA compliance reports

### Agent Status

Each agent card displays its current status:
- **idle** - Ready to run
- **generating** - Currently processing
- **completed** - Finished successfully
- **error** - Failed with error

Statuses are automatically updated every 5 seconds.

### Automated Mode

- Click "Start Automated Mode" to run all agents automatically for 15 minutes
- While active, manual agent controls are disabled
- Click "Stop Automated Mode" to stop early

## 📡 API Integration

The app connects to your backend API (configured via `VITE_API_URL` environment variable).

All API calls are handled through `src/services/api.ts`. See `readme/API_QUICK_REFERENCE.md` for full API documentation.

### Available Endpoints

- `/health` - Health check
- `/agents/{agentName}/status` - Get agent status
- `/agents/automated-mode/toggle` - Toggle automated mode
- `/agents/evaluation/create-demo` - Create demo evaluation
- `/mentor/make-scenario` - Generate scenario
- `/agents/notification/safety-check` - Run safety check
- `/agents/coa-compliance/generate-reports` - Generate COA reports
- `/agents/site/generate-report` - Generate site report
- `/agents/time-savings/analytics` - Get time savings analytics

## Project Structure

```
src/
├── App.tsx              # Main App component with agent controls
├── main.tsx             # Application entry point
├── index.css            # Global styles with Tailwind imports
├── services/
│   └── api.ts          # API service functions
└── assets/              # Static assets

public/
├── logo.png            # PrecepGo logo
├── favicon.ico         # Favicon
└── manifest.json       # PWA manifest

Dockerfile              # Docker configuration for Cloud Run
deploy.sh              # Deployment script
tailwind.config.js     # Tailwind CSS configuration
postcss.config.js      # PostCSS configuration
vite.config.ts         # Vite configuration
```

## 📚 Documentation

- **API Reference**: `readme/API_QUICK_REFERENCE.md`
- **Deployment Guide**: `readme/FRONTEND_DEPLOYMENT_GUIDE.md`
- **Design System**: `readme/DESIGN.MD`

## 🔧 Troubleshooting

### Build Errors

If you encounter build errors:
1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Clear Vite cache: `rm -rf node_modules/.vite`

### Deployment Issues

- Check that gcloud is authenticated: `gcloud auth login`
- Verify project is set: `gcloud config get-value project`
- Check Cloud Run logs: `gcloud run logs read precepgo-adk-frontend --region us-central1`

### API Connection Issues

- Verify the API URL is correct in `.env` file
- Check backend service status: `curl $VITE_API_URL/health`
- Check browser console for CORS errors
- Ensure your backend CORS settings allow requests from your frontend origin

### CORS Errors

If you see CORS errors in the browser console:
1. The backend needs to be configured to allow requests from your frontend origin
2. See `CORS_FIX.md` for detailed instructions on updating the backend
3. The frontend will display a CORS error banner showing the exact origin that needs to be allowed
4. After updating the backend CORS settings, redeploy the backend service

## 📝 Notes

- Agent operations may take 30-60 seconds to complete
- Status updates are real-time via Firestore listeners
- Automated mode can be toggled on/off via the UI switch
- Firebase anonymous authentication is used for Firestore access

## 🔒 Security

- Firebase API keys are safe to expose in frontend code (security is handled by Firebase security rules)
- Ensure your Firestore security rules are properly configured
- Backend API should implement proper authentication/authorization
- Never commit `.env` files with actual secrets

## 📄 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines if applicable]

## 📧 Contact

[Add contact information if desired]

## 🆘 Support

For backend issues:
- Check backend logs: `gcloud run logs read precepgo-adk-panel --region us-central1`
- Verify service status: `gcloud run services describe precepgo-adk-panel --region us-central1`
