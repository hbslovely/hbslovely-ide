import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ProjectCreatorComponent } from '../../components/project-creator/project-creator.component';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="projects-container">
      <div class="projects-header">
        <h1>My Projects</h1>
        <button mat-raised-button color="primary" (click)="createProject()">
          <mat-icon>add</mat-icon>
          New Project
        </button>
      </div>

      <div class="projects-grid">
        <mat-card *ngFor="let project of projects" class="project-card" (click)="openProject(project)">
          <mat-card-header>
            <mat-card-title>{{ project.name }}</mat-card-title>
            <mat-card-subtitle>{{ project.template | titlecase }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>{{ project.description || 'No description' }}</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary">Open</button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .projects-container {
      padding: 24px;
      background-color: #1e1e1e;
      color: #d4d4d4;
      min-height: 100vh;
    }

    .projects-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;

      h1 {
        font-size: 24px;
        font-weight: 300;
        margin: 0;
      }

      button {
        mat-icon {
          margin-right: 8px;
        }
      }
    }

    .projects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
    }

    .project-card {
      background-color: #252526;
      border: 1px solid #333;
      cursor: pointer;
      transition: transform 0.2s ease;

      &:hover {
        transform: translateY(-4px);
      }

      mat-card-title {
        color: #d4d4d4;
        font-size: 18px;
      }

      mat-card-subtitle {
        color: #9e9e9e;
      }

      mat-card-content {
        color: #d4d4d4;
        opacity: 0.8;
        margin: 16px 0;
      }

      mat-card-actions {
        padding: 8px;
        border-top: 1px solid #333;
      }
    }
  `]
})
export class ProjectsComponent implements OnInit {
  projects: Project[] = [];

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    // TODO: Load projects from service
    // For now, we'll use sample data
    this.projects = [
      {
        id: 'cfaf2190-1046-4e91-af1e-0bfea70c350e',
        name: 'Sample Project',
        description: 'A sample Angular project',
        template: 'angular',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        files: []
      }
    ];
  }

  createProject() {
    const dialogRef = this.dialog.open(ProjectCreatorComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Refresh projects list
        // TODO: Implement this when we have the API
      }
    });
  }

  openProject(project: Project) {
    this.router.navigate(['/solution', project.id]);
  }
} 