# PrecepGo Agents Frontend - Public Repository Checklist

## ✅ Pre-Deployment Checklist

Before making this repository public, ensure:

- [x] `.gitignore` includes `.env` files
- [x] `.env.example` created with template values
- [x] No hardcoded secrets in code (Firebase API keys are safe - they're public by design)
- [x] README updated with generic instructions
- [x] Deployment scripts use environment variables
- [ ] Update Firebase config if needed (currently hardcoded, safe for public)
- [ ] Add LICENSE file
- [ ] Review all files for any internal URLs or project-specific references

## 🔒 Security Notes

1. **Firebase API Keys**: The Firebase API key in `src/config/firebase.ts` is safe to expose. Firebase API keys are public by design and security is handled by Firebase security rules.

2. **Environment Variables**: 
   - Never commit `.env` files
   - Use `.env.example` as a template
   - All sensitive values should be in environment variables

3. **API URLs**: 
   - Default API URL in `api.ts` is a fallback
   - Users should set `VITE_API_URL` in their `.env` file
   - Deployment script uses environment variables

## 📝 Files to Review Before Publishing

- [ ] `deploy.sh` - Update with your project details or use env vars
- [ ] `cloudbuild.yaml` - Uses substitutions, update as needed
- [ ] `src/config/firebase.ts` - Consider moving to env vars for flexibility
- [ ] `README.md` - Update with your repository URL
- [ ] Add LICENSE file

## 🚀 Quick Start for Contributors

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Update `.env` with your configuration
4. Run `npm install`
5. Run `npm run dev`

## 📦 Deployment

Update `deploy.sh` with your values or set environment variables:
```bash
export GCP_PROJECT_ID=your-project-id
export API_URL=https://your-api-url.run.app
./deploy.sh
```

