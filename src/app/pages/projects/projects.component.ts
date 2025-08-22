import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProjectCreatorComponent } from '../../components/project-creator/project-creator.component';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    ProjectCreatorComponent
  ],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  loading = true;
  private subscription?: Subscription;

  constructor(
    private projectService: ProjectService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription = this.projectService.getProjects().subscribe(
      projects => {
        this.projects = projects;
        this.loading = false;
      }
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  getProjectIcon(template: string): string {
    switch (template) {
      case 'angular':
        return 'code';
      case 'react':
        return 'web';
      default:
        return 'folder';
    }
  }

  getProjectColor(template: string): string {
    switch (template) {
      case 'angular':
        return '#dd0031';
      case 'react':
        return '#61dafb';
      default:
        return '#757575';
    }
  }

  async createProject() {
    const dialogRef = this.dialog.open(ProjectCreatorComponent, {
      width: '500px',
      disableClose: true
    });

    const result = await dialogRef.afterClosed().toPromise();
    if (result) {
      this.loading = true;
      try {
        const project = await this.projectService.createProject(
          result.name,
          result.description,
          result.template
        );
        await this.router.navigate(['/solution', project.id]);
      } catch (error) {
        console.error('Error creating project:', error);
        this.loading = false;
      }
    }
  }

  async openProject(project: Project) {
    await this.router.navigate(['/solution', project.id]);
  }

  async deleteProject(event: Event, project: Project) {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete ${project.name}?`)) {
      try {
        await this.projectService.deleteProject(project.id);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  }
} 