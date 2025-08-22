import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FileExplorerComponent } from '../../components/file-explorer/file-explorer.component';
import { EditorComponent } from '../../components/editor/editor.component';
import { ConsoleComponent } from '../../components/console/console.component';
import { NetworkComponent } from '../../components/network/network.component';
import { ElementsInspectorComponent } from '../../components/elements-inspector/elements-inspector.component';
import { PreviewComponent } from '../../components/preview/preview.component';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';
import { ProjectService } from '../../services/project.service';
import { EditorService } from '../../services/editor.service';
import { ProjectRunnerService, ProjectStatus } from '../../services/project-runner.service';
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
    MatProgressBarModule,
    FileExplorerComponent,
    EditorComponent,
    ConsoleComponent,
    NetworkComponent,
    ElementsInspectorComponent,
    PreviewComponent,
    SafeUrlPipe
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  project: Project | null = null;
  sidebarOpen = true;
  rightSidebarOpen = true;
  status: ProjectStatus | null = null;
  private subscriptions: Subscription[] = [];
  currentFile: { name: string; content: string; path: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService,
    private editorService: EditorService,
    private runnerService: ProjectRunnerService
  ) {}

  ngOnInit() {
    // Get project ID from route
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      // Load project and save it as current project
      this.projectService.loadProject(projectId);
      
      // Subscribe to project changes
      this.subscriptions.push(
        this.projectService.getCurrentProject().subscribe(
          project => {
            this.project = project;
            if (project) {
              // Save project ID in localStorage
              localStorage.setItem('currentProjectId', project.id);
            }
          }
        )
      );

      // Subscribe to active file changes
      this.subscriptions.push(
        this.editorService.getActiveFile().subscribe(file => {
          if (file) {
            this.currentFile = {
              name: file.name,
              content: file.content,
              path: file.path
            };
          } else {
            this.currentFile = null;
          }
        })
      );

      // Subscribe to runner status
      this.subscriptions.push(
        this.runnerService.getStatus().subscribe(status => {
          this.status = status;
        })
      );
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Stop serving if active
    if (this.status?.isServing) {
      this.runnerService.stopServing();
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleRightSidebar() {
    this.rightSidebarOpen = !this.rightSidebarOpen;
  }

  async buildProject() {
    if (this.project) {
      try {
        await this.runnerService.buildProject(this.project.id);
      } catch (error) {
        console.error('Error building project:', error);
      }
    }
  }

  async serveProject() {
    if (this.project) {
      try {
        if (this.status?.isServing) {
          this.runnerService.stopServing();
        } else {
          await this.runnerService.serveProject(this.project.id);
        }
      } catch (error) {
        console.error('Error serving project:', error);
      }
    }
  }

  isPreviewableFile(): boolean {
    if (!this.currentFile) return false;
    const ext = this.currentFile.name.split('.').pop()?.toLowerCase() || '';
    return [
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg',
      'pdf', 'mp4', 'webm', 'ogg', 'mp3', 'wav'
    ].includes(ext);
  }

  shouldShowPreview(): boolean {
    if (this.isPreviewableFile()) return true;
    if (!this.status) return false;
    return this.status.isServing && !!this.status.serveUrl;
  }
} 