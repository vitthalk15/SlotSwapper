const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: { message: string } }> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || 'Request failed' } };
      }

      return { data };
    } catch (error) {
      return { error: { message: (error as Error).message || 'Network error' } };
    }
  }

  // Auth methods
  async signUp(name: string, email: string, password: string) {
    const result = await this.request<{ data: { user: any; token: string } }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (result.data?.data?.token) {
      localStorage.setItem('token', result.data.data.token);
    }

    return result;
  }

  async signIn(email: string, password: string) {
    const result = await this.request<{ data: { user: any; token: string } }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.data?.data?.token) {
      localStorage.setItem('token', result.data.data.token);
    }

    return result;
  }

  async signOut() {
    const result = await this.request('/api/auth/signout', {
      method: 'POST',
    });

    localStorage.removeItem('token');
    return result;
  }

  async getCurrentUser() {
    const result = await this.request<{ data: { user: any } }>('/api/auth/me');
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  // Event methods
  async getEvents() {
    const result = await this.request<{ data: any[] }>('/api/events');
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async createEvent(event: {
    title: string;
    start_time: string;
    end_time: string;
    status?: string;
  }) {
    const result = await this.request<{ data: any }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async updateEvent(id: string, event: Partial<{
    title: string;
    start_time: string;
    end_time: string;
    status: string;
  }>) {
    const result = await this.request<{ data: any }>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async deleteEvent(id: string) {
    return this.request(`/api/events/${id}`, {
      method: 'DELETE',
    });
  }

  async getSwappableEvents() {
    const result = await this.request<{ data: any[] }>('/api/events/swappable');
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async getMySwappableEvents() {
    const result = await this.request<{ data: any[] }>('/api/events/my-swappable');
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  // Swap request methods
  async getIncomingSwapRequests() {
    const result = await this.request<{ data: any[] }>('/api/swap-requests/incoming');
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async getOutgoingSwapRequests() {
    const result = await this.request<{ data: any[] }>('/api/swap-requests/outgoing');
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async createSwapRequest(requester_event_id: string, recipient_event_id: string) {
    const result = await this.request<{ data: any }>('/api/swap-requests', {
      method: 'POST',
      body: JSON.stringify({ requester_event_id, recipient_event_id }),
    });
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  async respondToSwapRequest(id: string, accept: boolean) {
    const result = await this.request<{ data: any }>(`/api/swap-requests/${id}/respond`, {
      method: 'PUT',
      body: JSON.stringify({ accept }),
    });
    // Unwrap the nested data structure
    if (result.data?.data) {
      return { data: result.data.data };
    }
    return result;
  }

  // Profile methods
  async getProfile(userId: string) {
    return this.request<{ name: string; email: string }>(`/api/profiles/${userId}`);
  }
}

export const apiClient = new ApiClient(API_URL);

