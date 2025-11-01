// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Get authentication token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("accessToken");
}

/**
 * Set authentication token in localStorage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem("accessToken", token);
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem("accessToken");
}

/**
 * Get authorization headers with Bearer token
 */
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Make authenticated GET request
 */
export async function apiGet(endpoint: string): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });
}

/**
 * Make authenticated POST request
 */
export async function apiPost(endpoint: string, data?: unknown): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    method: "POST",
    headers: getAuthHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make authenticated PUT request
 */
export async function apiPut(endpoint: string, data?: unknown): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Make authenticated DELETE request
 */
export async function apiDelete(endpoint: string): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

/**
 * Make authenticated PATCH request
 */
export async function apiPatch(endpoint: string, data?: unknown): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  return fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * Upload file with authentication
 */
export async function apiUpload(
  endpoint: string, 
  file: File, 
  fieldName: string = "file",
  extraParams?: Record<string, string>
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const formData = new FormData();
  formData.append(fieldName, file);
  
  // Add extra parameters if provided
  if (extraParams) {
    Object.entries(extraParams).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });
}

/**
 * Upload file with additional form data fields (for publications)
 */
export async function apiUploadWithFormData(
  endpoint: string, 
  file: File, 
  formFields: Record<string, string>
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const formData = new FormData();
  formData.append("file", file);
  
  // Add all additional form fields
  Object.entries(formFields).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });
}

/**
 * Handle API errors consistently
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = "An error occurred";
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.detail || errorData.message || errorMessage;
  } catch {
    errorMessage = response.statusText || errorMessage;
  }
  
  throw new Error(errorMessage);
}

/**
 * Login user and store token
 */
export async function login(email: string, password: string): Promise<{ user: { id: string; name: string; email: string; domain?: string }; accessToken: string }> {
  const response = await apiPost("/auth/login", { email, password });
  
  if (!response.ok) {
    await handleApiError(response);
  }
  
  const data = await response.json();
  
  if (data.accessToken) {
    setAuthToken(data.accessToken);
  }
  
  return data;
}

/**
 * Signup user and store token
 */
export async function signup(name: string, email: string, password: string, domain?: string): Promise<{ user: { id: string; name: string; email: string; domain?: string }; accessToken: string }> {
  const response = await apiPost("/auth/signup", { name, email, password, domain });
  
  if (!response.ok) {
    await handleApiError(response);
  }
  
  const data = await response.json();
  
  if (data.accessToken) {
    setAuthToken(data.accessToken);
  }
  
  return data;
}

/**
 * Logout user
 */
export function logout(): void {
  removeAuthToken();
  window.location.href = "/login";
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}
