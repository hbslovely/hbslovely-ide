import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ProjectConfig } from '../components/project-creator/project-creator.component';
import { FileNode } from '../models/file.model';
import { StorageService } from './storage.service';

export interface Project {
  id: string;
  name: string;
  description?: string;
  framework: 'angular' | 'react';
  createdAt: Date;
  updatedAt: Date;
  config: ProjectConfig;
}

export interface ProjectLog {
  type: 'stdout' | 'stderr' | 'info' | 'error';
  data: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private currentProject = new BehaviorSubject<Project | null>(null);
  private projectLogs = new Subject<ProjectLog>();
  private ws: WebSocket | null = null;
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private storageService: StorageService
  ) {
    this.loadProjectFromStorage();
  }

  private async loadProjectFromStorage() {
    const projectId = localStorage.getItem('currentProjectId');
    if (projectId) {
      const project = await this.storageService.getProject(projectId);
      if (project) {
        this.currentProject.next(project);
        this.connectWebSocket(projectId);
      }
    }
  }

  private connectWebSocket(projectId: string) {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket('ws://localhost:3000');

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({ type: 'init', projectId }));
    };

    this.ws.onmessage = (event) => {
      const log = JSON.parse(event.data);
      this.projectLogs.next({
        ...log,
        timestamp: new Date()
      });
    };

    this.ws.onclose = () => {
      // Try to reconnect after a delay
      setTimeout(() => this.connectWebSocket(projectId), 5000);
    };
  }

  async initializeProject(projectId: string, config: ProjectConfig, files: any[]): Promise<void> {
    const project: Project = {
      id: projectId,
      name: config.name,
      description: config.description,
      framework: config.framework,
      createdAt: new Date(),
      updatedAt: new Date(),
      config
    };

    // Save project metadata
    await this.storageService.saveProject(project);
    localStorage.setItem('currentProjectId', project.id);
    this.currentProject.next(project);

    // Connect to WebSocket for logs
    this.connectWebSocket(project.id);

    // Save project files
    const fileNodes: FileNode[] = files.map(file => ({
      name: file.name,
      type: file.type,
      path: file.path,
      content: file.content,
      extension: file.path.split('.').pop()
    }));

    await this.storageService.saveFiles(project.id, fileNodes);
  }

  async serveProject(projectId: string): Promise<void> {
    await this.http.post(`${this.API_URL}/project/${projectId}/serve`, {}).toPromise();
  }

  async buildProject(projectId: string): Promise<void> {
    await this.http.post(`${this.API_URL}/project/${projectId}/build`, {}).toPromise();
  }

  getCurrentProject(): Observable<Project | null> {
    return this.currentProject.asObservable();
  }

  getProjectLogs(): Observable<ProjectLog> {
    return this.projectLogs.asObservable();
  }

  async saveFile(projectId: string, file: FileNode): Promise<void> {
    await this.storageService.saveFile(projectId, file);
    const project = this.currentProject.value;
    if (project && project.id === projectId) {
      project.updatedAt = new Date();
      await this.storageService.saveProject(project);
    }
  }

  async getFile(projectId: string, path: string): Promise<FileNode | null> {
    return this.storageService.getFile(projectId, path);
  }

  async deleteFile(projectId: string, path: string): Promise<void> {
    await this.storageService.deleteFile(projectId, path);
    const project = this.currentProject.value;
    if (project && project.id === projectId) {
      project.updatedAt = new Date();
      await this.storageService.saveProject(project);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.storageService.deleteProject(projectId);
    if (this.currentProject.value?.id === projectId) {
      localStorage.removeItem('currentProjectId');
      this.currentProject.next(null);
    }
  }

  async searchFiles(projectId: string, query: string): Promise<FileNode[]> {
    return this.storageService.searchFiles(projectId, query);
  }

  async getRecentFiles(projectId: string, limit: number = 10): Promise<FileNode[]> {
    return this.storageService.getRecentFiles(projectId, limit);
  }
} 