const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-api-url.run.app';

// Log API calls in development
const DEBUG = import.meta.env.DEV;

// Helper function to handle fetch with better error handling
async function fetchWithErrorHandling(url: string, options?: RequestInit) {
  if (DEBUG) {
    console.log(`[API] ${options?.method || 'GET'} ${url}`);
  }

  try {
    const response = await fetch(url, {
      ...options,
      mode: 'cors', // Explicitly request CORS
      credentials: 'omit', // Don't send credentials
    });

    if (DEBUG) {
      console.log(`[API] Response status: ${response.status} for ${url}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (DEBUG) {
        console.error(`[API] Error response for ${url}:`, errorText);
      }
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText.substring(0, 100)}`);
    }

    return response.json();
  } catch (error: any) {
    if (DEBUG) {
      console.error(`[API] Fetch error for ${url}:`, error);
    }
    // Check if it's a CORS error or connection reset (which often indicates CORS blocking)
    if (error.message?.includes('CORS') || 
        error.message?.includes('ERR_CONNECTION_RESET') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'TypeError' && error.message?.includes('Failed to fetch')) {
      const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
      throw new Error(`CORS_ERROR: Backend server is not configured to allow requests from origin: ${frontendOrigin}. Please update the backend CORS settings to include this origin.`);
    }
    throw error;
  }
}

export const api = {
  // Health check
  async healthCheck() {
    return fetchWithErrorHandling(`${API_BASE_URL}/health`);
  },

  // Get agent status
  async getAgentStatus(agentName: string) {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/${agentName}/status`);
  },

  // Create demo evaluation
  async createDemoEvaluation() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/evaluation/create-demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Generate scenario
  async generateScenario() {
    return fetchWithErrorHandling(`${API_BASE_URL}/mentor/make-scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Run safety check
  async runSafetyCheck() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/notification/safety-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Generate COA reports
  async generateCOAReports() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/coa-compliance/generate-reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Automated mode - start
  async startAutomatedMode() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/automated-mode/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Automated mode - stop
  async stopAutomatedMode() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/automated-mode/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Automated mode - status
  async getAutomatedModeStatus() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/automated-mode/status`);
  },

  // Automated mode - toggle
  async toggleAutomatedMode() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/automated-mode/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // Time Savings Analytics
  async getTimeSavingsAnalytics(timeframe: string = 'monthly', includeInsights: boolean = true) {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/time-savings/analytics?timeframe=${timeframe}&include_insights=${includeInsights}`);
  },

  // Generate Site Report
  async generateSiteReport() {
    return fetchWithErrorHandling(`${API_BASE_URL}/agents/site/generate-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

