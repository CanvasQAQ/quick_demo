export interface ApiConfig {
  url: string
  port: number
}

export interface ApiService {
  baseURL: string
  get(endpoint: string): Promise<any>
  post(endpoint: string, data: any): Promise<any>
  put(endpoint: string, data: any): Promise<any>
  delete(endpoint: string): Promise<any>
  request(endpoint: string, options?: RequestInit): Promise<any>
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  url: 'http://localhost',
  port: 3000
}