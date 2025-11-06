import { apiClient } from './api';

export const signUp = async (name: string, email: string, password: string) => {
  const result = await apiClient.signUp(name, email, password);
  
  if (result.error) {
    return { data: null, error: result.error };
  }
  
  // Trigger auth change event
  window.dispatchEvent(new Event('auth-change'));
  
  // Unwrap nested data structure
  return { data: result.data?.data || result.data, error: null };
};

export const signIn = async (email: string, password: string) => {
  const result = await apiClient.signIn(email, password);
  
  if (result.error) {
    return { data: null, error: result.error };
  }
  
  // Trigger auth change event
  window.dispatchEvent(new Event('auth-change'));
  
  // Unwrap nested data structure
  return { data: result.data?.data || result.data, error: null };
};

export const signOut = async () => {
  const result = await apiClient.signOut();
  
  // Trigger auth change event
  window.dispatchEvent(new Event('auth-change'));
  
  if (result.error) {
    return { error: result.error };
  }
  
  return { error: null };
};
