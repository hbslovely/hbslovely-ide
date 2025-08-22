import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Project } from '../models/project.model';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.solutions}`;
  private currentProjectSubject = new BehaviorSubject<Project | null>(null);

  constructor(private http: HttpClient) {
    // Load current project from localStorage
    const projectId = localStorage.getItem('currentProjectId');
    if (projectId) {
      this.loadProject(projectId);
    }
  }

  getCurrentProject(): Observable<Project | null> {
    return this.currentProjectSubject.asObservable();
  }

  getCurrentProjectValue(): Project | null {
    return this.currentProjectSubject.value;
  }

  async loadProject(id: string): Promise<void> {
    try {
      const project = await this.http.get<Project>(`${this.apiUrl}/${id}`).toPromise();
      this.currentProjectSubject.next(project!);
      localStorage.setItem('currentProjectId', id);
    } catch (error) {
      console.error('Error loading project:', error);
      this.currentProjectSubject.next(null);
      localStorage.removeItem('currentProjectId');
    }
  }

  async createProject(name: string, description: string, template: string): Promise<Project> {
    const project = await this.http.post<Project>(this.apiUrl, {
      name,
      description,
      template
    }).toPromise();

    if (project) {
      this.currentProjectSubject.next(project);
      localStorage.setItem('currentProjectId', project.id);
    }

    return project!;
  }

  async getFile(projectId: string, filePath: string): Promise<string> {
    const response = await this.http.get<{ content: string }>(
      `${this.apiUrl}/${projectId}/file`,
      { params: { path: filePath } }
    ).toPromise();
    return response!.content;
  }

  async updateFile(projectId: string, filePath: string, content: string): Promise<void> {
    await this.http.put(
      `${this.apiUrl}/${projectId}/file`,
      { path: filePath, content }
    ).toPromise();
  }

  async deleteProject(id: string): Promise<void> {
    await this.http.delete(`${this.apiUrl}/${id}`).toPromise();
    if (this.currentProjectSubject.value?.id === id) {
      this.currentProjectSubject.next(null);
      localStorage.removeItem('currentProjectId');
    }
  }

  async serveProject(projectId: string): Promise<void> {
    await this.http.post(`${this.apiUrl}/${projectId}/serve`, {}).toPromise();
  }

  async buildProject(projectId: string): Promise<void> {
    await this.http.post(`${this.apiUrl}/${projectId}/build`, {}).toPromise();
  }
}
