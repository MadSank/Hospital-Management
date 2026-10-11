import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Bearer token to all outgoing requests if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medflow_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercept responses for global 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not already on /login, clear stale credentials
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('medflow_token')
        localStorage.removeItem('medflow_user')
      }
    }
    return Promise.reject(error)
  }
)
