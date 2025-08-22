import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EditorComponent } from './components/editor/editor.component';
import { FileExplorerComponent } from './components/file-explorer/file-explorer.component';
import { PreviewComponent } from './components/preview/preview.component';
import { ConsoleComponent } from './components/console/console.component';
import { NetworkComponent } from './components/network/network.component';
import { ElementsInspectorComponent } from './components/elements-inspector/elements-inspector.component';
import { ProjectCreatorComponent } from './components/project-creator/project-creator.component';
import { ProjectService } from './services/project.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    EditorComponent,
    FileExplorerComponent,
    PreviewComponent,
    ConsoleComponent,
    NetworkComponent,
    ElementsInspectorComponent
  ]
})
export class AppComponent implements OnInit {
  activeTab: 'console' | 'network' | 'elements' = 'console';

  constructor(
    private dialog: MatDialog,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    this.projectService.getCurrentProject().subscribe(project => {
      if (!project) {
        this.showProjectCreator();
      }
    });
  }

  private showProjectCreator(): void {
    const dialogRef = this.dialog.open(ProjectCreatorComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) {
        // If user somehow closes the dialog without creating a project,
        // show it again
        this.showProjectCreator();
      }
    });
  }
}
