import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ProjectCreatorComponent } from '../../components/project-creator/project-creator.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(
    private dialog: MatDialog,
    private router: Router
  ) {}

  showProjectCreator() {
    const dialogRef = this.dialog.open(ProjectCreatorComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Get the current project ID from localStorage
        const projectId = localStorage.getItem('currentProjectId');
        if (projectId) {
          // Navigate to the project detail page
          this.router.navigate(['/project', projectId]);
        }
      }
    });
  }
} 