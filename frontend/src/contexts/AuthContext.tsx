import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import type { LoginResponse, UserSummary } from '../types/auth'

interface AuthContextType {
  user: UserSummary | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<UserSummary>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Check initial auth state from localStorage
    const savedToken = localStorage.getItem('medflow_token')
    const savedUserStr = localStorage.getItem('medflow_user')

    if (savedToken && savedUserStr) {
      try {
        const parsedUser: UserSummary = JSON.parse(savedUserStr)
        setToken(savedToken)
        setUser(parsedUser)
      } catch (e) {
        localStorage.removeItem('medflow_token')
        localStorage.removeItem('medflow_user')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<UserSummary> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    })

    const { access_token, user: loggedUser } = response.data
    localStorage.setItem('medflow_token', access_token)
    localStorage.setItem('medflow_user', JSON.stringify(loggedUser))

    setToken(access_token)
    setUser(loggedUser)
    return loggedUser
  }

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await apiClient.post('/auth/logout')
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('medflow_token')
      localStorage.removeItem('medflow_user')
      setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
