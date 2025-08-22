import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Project, ProjectConfig, ProjectLog } from '../models/project.model';
import { StorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';
import { FileNode } from '../models/file.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private ws: WebSocket | null = null;
  private apiUrl = environment.apiUrl;
  private wsUrl = environment.wsUrl;

  currentProject = new BehaviorSubject<Project | null>(null);
  projectLogs = new Subject<ProjectLog>();

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

  async createProject(config: ProjectConfig): Promise<void> {
    const projectId = uuidv4();
    
    try {
      const response = await this.http.post<FileNode[]>(`${this.apiUrl}/projects`, {
        projectId,
        ...config
      }).toPromise();

      if (response) {
        await this.initializeProject(projectId, config, response);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  private async initializeProject(projectId: string, config: ProjectConfig, files: FileNode[]): Promise<void> {
    const project: Project = {
      id: projectId,
      name: config.name,
      description: config.description,
      framework: config.framework,
      createdAt: new Date(),
      updatedAt: new Date(),
      config,
      logs: []
    };

    // Save project metadata
    await this.storageService.saveProject(project);
    localStorage.setItem('currentProjectId', project.id);
    this.currentProject.next(project);

    // Connect to WebSocket for logs
    this.connectWebSocket(project.id);

    // Save project files
    await this.storageService.saveFiles(project.id, files);
  }

  private connectWebSocket(projectId: string): void {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`${this.wsUrl}?projectId=${projectId}`);
    
    this.ws.onmessage = (event) => {
      try {
        const log: ProjectLog = JSON.parse(event.data);
        this.projectLogs.next(log);

        // Update project logs
        const project = this.currentProject.value;
        if (project && project.id === projectId) {
          project.logs.push(log);
          project.updatedAt = new Date();
          this.storageService.saveProject(project).catch(error => {
            console.error('Error saving project logs:', error);
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.projectLogs.next({
          type: 'error',
          data: 'Error parsing WebSocket message',
          timestamp: new Date()
        });
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.projectLogs.next({
        type: 'error',
        data: 'WebSocket connection failed',
        timestamp: new Date()
      });
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
  }

  async executeCommand(projectId: string, command: string): Promise<void> {
    try {
      await this.http.post(`${this.apiUrl}/projects/${projectId}/execute`, {
        command
      }).toPromise();
    } catch (error) {
      console.error('Error executing command:', error);
      throw error;
    }
  }

  async serveProject(projectId: string): Promise<void> {
    await this.executeCommand(projectId, 'npm run serve');
  }

  async buildProject(projectId: string): Promise<void> {
    await this.executeCommand(projectId, 'npm run build');
  }

  async saveFile(projectId: string, file: FileNode): Promise<void> {
    await this.storageService.saveFile(projectId, file);
    const project = this.currentProject.value;
    if (project) {
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
    if (project) {
      project.updatedAt = new Date();
      await this.storageService.saveProject(project);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.storageService.deleteProject(projectId);
    if (this.currentProject.value?.id === projectId) {
      localStorage.removeItem('currentProjectId');
      this.currentProject.next(null);
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }

  async searchFiles(projectId: string, query: string): Promise<FileNode[]> {
    return this.storageService.searchFiles(projectId, query);
  }

  async getRecentFiles(projectId: string, limit: number = 10): Promise<FileNode[]> {
    return this.storageService.getRecentFiles(projectId, limit);
  }

  getCurrentProject(): BehaviorSubject<Project | null> {
    return this.currentProject;
  }

  getProjectLogs(): Subject<ProjectLog> {
    return this.projectLogs;
  }
}
