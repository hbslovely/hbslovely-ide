export interface ProjectConfig {
  name: string;
  description?: string;
  framework: 'angular' | 'react';
}

export interface ProjectLog {
  type: 'stdout' | 'stderr' | 'error';
  data: string;
  timestamp: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  template: string;
  createdAt: string;
  updatedAt: string;
  files: ProjectFile[];
}

export interface ProjectFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: string;
  children?: ProjectFile[];
} 