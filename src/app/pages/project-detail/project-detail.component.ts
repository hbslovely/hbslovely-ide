import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { FileExplorerComponent } from '../../components/file-explorer/file-explorer.component';
import { EditorComponent } from '../../components/editor/editor.component';
import { ConsoleComponent } from '../../components/console/console.component';
import { NetworkComponent } from '../../components/network/network.component';
import { ElementsInspectorComponent } from '../../components/elements-inspector/elements-inspector.component';
import { ProjectService } from '../../services/project.service';
import { Project } from '../../models/project.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatTabsModule,
    FileExplorerComponent,
    EditorComponent,
    ConsoleComponent,
    NetworkComponent,
    ElementsInspectorComponent
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  sidebarOpen = true;
  private subscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    // Get project ID from route
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      // Load project and save it as current project
      this.projectService.loadProject(projectId);
      
      // Subscribe to project changes
      this.subscription = this.projectService.getCurrentProject().subscribe(
        project => {
          this.project = project;
          if (project) {
            // Save project ID in localStorage
            localStorage.setItem('currentProjectId', project.id);
          }
        }
      );
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  async serveProject() {
    if (this.project) {
      try {
        await this.projectService.serveProject(this.project.id);
      } catch (error) {
        console.error('Error serving project:', error);
      }
    }
  }

  async buildProject() {
    if (this.project) {
      try {
        await this.projectService.buildProject(this.project.id);
      } catch (error) {
        console.error('Error building project:', error);
      }
    }
  }
} 