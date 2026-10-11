import { apiClient as api } from './client'
import type { DashboardReportResponse } from '../types/reports'

export interface GetReportsSummaryParams {
  start_date?: string
  end_date?: string
}

export const getReportsSummary = async (
  params?: GetReportsSummaryParams
): Promise<DashboardReportResponse> => {
  const response = await api.get<DashboardReportResponse>('/reports/summary', { params })
  return response.data
}
