import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProjectService } from './project.service';

export interface ProjectStatus {
  isBuilding: boolean;
  isServing: boolean;
  buildOutput: string[];
  serveOutput: string[];
  serveUrl?: string;
  buildError?: string;
  serveError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectRunnerService {
  private statusSubject = new BehaviorSubject<ProjectStatus>({
    isBuilding: false,
    isServing: false,
    buildOutput: [],
    serveOutput: []
  });

  constructor(private projectService: ProjectService) {}

  getStatus(): Observable<ProjectStatus> {
    return this.statusSubject.asObservable();
  }

  getCurrentStatus(): ProjectStatus {
    return this.statusSubject.value;
  }

  async buildProject(projectId: string): Promise<boolean> {
    const currentStatus = this.getCurrentStatus();
    if (currentStatus.isBuilding) return false;

    try {
      // Update status to building
      this.statusSubject.next({
        ...currentStatus,
        isBuilding: true,
        buildOutput: [],
        buildError: undefined
      });

      // Call build API
      await this.projectService.buildProject(projectId);

      // Update status to built
      this.statusSubject.next({
        ...this.getCurrentStatus(),
        isBuilding: false,
        buildOutput: ['Build completed successfully']
      });

      return true;
    } catch (error) {
      // Update status with error
      this.statusSubject.next({
        ...this.getCurrentStatus(),
        isBuilding: false,
        buildError: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      return false;
    }
  }

  async serveProject(projectId: string): Promise<boolean> {
    const currentStatus = this.getCurrentStatus();
    if (currentStatus.isServing) return false;

    try {
      // Update status to serving
      this.statusSubject.next({
        ...currentStatus,
        isServing: true,
        serveOutput: [],
        serveError: undefined
      });

      // Call serve API
      await this.projectService.serveProject(projectId);

      // Update status with serve URL
      // Note: In a real implementation, the server would return the actual URL
      const serveUrl = 'http://localhost:4200';
      this.statusSubject.next({
        ...this.getCurrentStatus(),
        isServing: true,
        serveUrl,
        serveOutput: [`Project is now serving at ${serveUrl}`]
      });

      return true;
    } catch (error) {
      // Update status with error
      this.statusSubject.next({
        ...this.getCurrentStatus(),
        isServing: false,
        serveError: error instanceof Error ? error.message : 'Unknown error occurred'
      });

      return false;
    }
  }

  stopServing() {
    // In a real implementation, you would call an API to stop the server
    this.statusSubject.next({
      ...this.getCurrentStatus(),
      isServing: false,
      serveUrl: undefined,
      serveOutput: []
    });
  }

  addBuildOutput(output: string) {
    const currentStatus = this.getCurrentStatus();
    this.statusSubject.next({
      ...currentStatus,
      buildOutput: [...currentStatus.buildOutput, output]
    });
  }

  addServeOutput(output: string) {
    const currentStatus = this.getCurrentStatus();
    this.statusSubject.next({
      ...currentStatus,
      serveOutput: [...currentStatus.serveOutput, output]
    });
  }

  clearOutput() {
    const currentStatus = this.getCurrentStatus();
    this.statusSubject.next({
      ...currentStatus,
      buildOutput: [],
      serveOutput: []
    });
  }
} 