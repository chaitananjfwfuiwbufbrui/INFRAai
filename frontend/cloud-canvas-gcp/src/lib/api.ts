// Centralized API configuration
export const API_BASE_URL = 'http://localhost:8000';

export const apiEndpoints = {
  generateGraph: `${API_BASE_URL}/generate-graph`,
  generateTerraform: `${API_BASE_URL}/generate_terraform`,
  getRunDetails: (runId: string) => `${API_BASE_URL}/${runId}`,
  execute: `${API_BASE_URL}/execute`,
};

// Helper function for API calls
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}
