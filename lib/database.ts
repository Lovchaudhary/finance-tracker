// Updated database.ts for MySQL backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types for our database tables (same as before)
export interface User {
  id: string
  email: string
  password?: string // Don't include in API responses
  name: string
  profile_url?: string
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  user_id: string
  category: string
  color: string
  created_at: string
}

export interface MonthlyExpense {
  id: string
  user_id: string
  category: string
  amount: number
  month: number
  year: number
  created_at: string
  updated_at: string
}

export interface ScheduledExpense {
  id: string
  user_id: string
  category: string
  amount: number
  expense_date: string
  description: string | null
  added_to_expenses: boolean
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  monthly_salary: number
  rollover_amount: number
  current_month: number
  current_year: number
  created_at: string
  updated_at: string
}

// Auth token management
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem('finance_auth_token', token);
  }
}

export function getAuthToken(): string | null {
  if (!authToken && typeof window !== 'undefined') {
    authToken = localStorage.getItem('finance_auth_token');
  }
  return authToken;
}

export function clearAuthToken() {
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('finance_auth_token');
  }
}

// API helper function
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Authentication functions
export async function registerUser(email: string, password: string, name: string, profileUrl?: string) {
  const data = await apiCall('/users/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, profileUrl }),
  });

  setAuthToken(data.token);
  return data.user as User;
}

export async function loginUser(email: string, password: string) {
  const data = await apiCall('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setAuthToken(data.token);
  return data.user as User;
}

export async function getCurrentUser() {
  const user = await apiCall('/users/me');
  return user as User;
}

// User operations (updated to use new API)
export async function createUser(email: string, password: string, name: string, profileUrl?: string) {
  return registerUser(email, password, name, profileUrl);
}

export async function getUserByEmail(email: string) {
  // Note: This would need backend support for admin functionality
  // For now, return null as this is mainly used for checking duplicates
  return null;
}

export async function getUserByName(name: string) {
  // Note: This would need backend support for admin functionality
  return null;
}

export async function authenticateUser(email: string, password: string) {
  try {
    return await loginUser(email, password);
  } catch (error) {
    return null;
  }
}

export async function updateUser(userId: string, updates: Partial<User>) {
  const user = await apiCall('/users/me', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return user as User;
}

// User settings operations
export async function getUserSettings(userId: string) {
  try {
    const settings = await apiCall('/user-settings');
    return settings as UserSettings;
  } catch (error) {
    return null;
  }
}

export async function createUserSettings(userId: string, settings: Partial<UserSettings>) {
  const data = await apiCall('/user-settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
  return data as UserSettings;
}

export async function updateUserSettings(userId: string, settings: Partial<UserSettings>) {
  const data = await apiCall('/user-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return data as UserSettings;
}

// Expense categories operations
export async function getExpenseCategories(userId: string) {
  const categories = await apiCall('/expense-categories');
  return categories as ExpenseCategory[];
}

export async function createExpenseCategory(userId: string, category: string, color: string) {
  const data = await apiCall('/expense-categories', {
    method: 'POST',
    body: JSON.stringify({ category, color }),
  });
  return data as ExpenseCategory;
}

// Monthly expenses operations
export async function getMonthlyExpenses(userId: string, month: number, year: number) {
  const expenses = await apiCall(`/monthly-expenses?month=${month}&year=${year}`);
  return expenses as MonthlyExpense[];
}

export async function upsertMonthlyExpense(
  userId: string,
  category: string,
  amount: number,
  month: number,
  year: number,
) {
  const data = await apiCall('/monthly-expenses', {
    method: 'POST',
    body: JSON.stringify({ category, amount, month, year }),
  });
  return data as MonthlyExpense;
}

// Scheduled expenses operations
export async function getScheduledExpenses(userId: string) {
  const expenses = await apiCall('/scheduled-expenses');
  return expenses as ScheduledExpense[];
}

export async function createScheduledExpense(
  userId: string,
  expense: Omit<ScheduledExpense, "id" | "user_id" | "created_at">,
) {
  const data = await apiCall('/scheduled-expenses', {
    method: 'POST',
    body: JSON.stringify(expense),
  });
  return data as ScheduledExpense;
}

export async function updateScheduledExpense(id: string, updates: Partial<ScheduledExpense>) {
  const data = await apiCall(`/scheduled-expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data as ScheduledExpense;
}

export async function deleteScheduledExpense(id: string) {
  await apiCall(`/scheduled-expenses/${id}`, {
    method: 'DELETE',
  });
}

// Initialize default categories for new users
export async function initializeDefaultCategories(userId: string) {
  // This will be handled automatically by the backend during user registration
  // Just fetch the categories that were created
  return await getExpenseCategories(userId);
}

// Initialize user with defaults
export async function initializeUserWithDefaults(userId: string) {
  // This is handled automatically by the backend during registration
  return true;
}

// Admin functions (for future use)
export async function getAllUsers() {
  // This would need admin authentication
  const users = await apiCall('/admin/users');
  return users as User[];
}

export async function deleteUserAndData(userId: string) {
  // This would need admin authentication
  await apiCall(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

// Profile image functions
export async function uploadProfileImage(userId: string, file: File) {
  const formData = new FormData();
  formData.append('profile', file);
  
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/upload-profile`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  const data = await response.json();
  return data.profile_url;
}

export async function getUserProfileImage(userId: string) {
  try {
    const user = await getCurrentUser();
    return user.profile_url || null;
  } catch (error) {
    console.error('Error getting user profile image:', error);
    return null;
  }
}