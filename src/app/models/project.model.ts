export interface ProjectConfig {
  name: string;
  description?: string;
  framework: 'angular' | 'react';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  framework: 'angular' | 'react';
  createdAt: Date;
  updatedAt: Date;
  config: ProjectConfig;
  logs: ProjectLog[];
}

export interface ProjectLog {
  type: 'stdout' | 'stderr' | 'info' | 'error';
  data: string;
  timestamp: Date;
} 