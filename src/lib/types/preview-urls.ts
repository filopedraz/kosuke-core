export interface PreviewUrl {
  id: string;
  project_id: string;
  branch_name: string;
  subdomain: string;
  full_url: string;
  container_status: 'running' | 'stopped' | 'error';
  ssl_enabled: boolean;
  created_at: string;
  last_accessed: string | null;
}

export interface PreviewUrlsResponse {
  preview_urls: PreviewUrl[];
  total_count: number;
}
