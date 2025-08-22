import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProjectService } from '../../services/project.service';
import { Subscription } from 'rxjs';
import { MatCheckboxModule } from '@angular/material/checkbox';

interface ProjectLog {
  type: 'stdout' | 'stderr' | 'error';
  data: string;
  timestamp: Date;
}

@Component({
  selector: 'app-project-creator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatCheckboxModule,
  ],
  templateUrl: './project-creator.component.html',
  styleUrls: ['./project-creator.component.scss']
})
export class ProjectCreatorComponent implements OnDestroy {
  projectForm: FormGroup;
  creating = false;
  canCancel = true;
  logs: ProjectLog[] = [];
  private logSubscription?: Subscription;

  constructor(
    private dialogRef: MatDialogRef<ProjectCreatorComponent>,
    private formBuilder: FormBuilder,
    private projectService: ProjectService
  ) {
    this.projectForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.pattern('^[a-z0-9-]+$')]],
      description: [''],
      template: ['angular', Validators.required]
    });
  }

  ngOnDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
  }

  async create() {
    if (this.projectForm.valid && !this.creating) {
      this.creating = true;
      this.logs = [];

      // Add initial log
      this.logs.push({
        type: 'stdout',
        data: 'Starting project creation...',
        timestamp: new Date()
      });

      // Add form details to logs
      const formValue = this.projectForm.value;
      this.logs.push({
        type: 'stdout',
        data: `Project Name: ${formValue.name}`,
        timestamp: new Date()
      });
      this.logs.push({
        type: 'stdout',
        data: `Template: ${formValue.template}`,
        timestamp: new Date()
      });
      if (formValue.description) {
        this.logs.push({
          type: 'stdout',
          data: `Description: ${formValue.description}`,
          timestamp: new Date()
        });
      }

      try {
        await this.projectService.createProject(
          formValue.name,
          formValue.description,
          formValue.template
        );
        this.canCancel = false; // Disable cancel button after successful creation

        // Add success log
        this.logs.push({
          type: 'stdout',
          data: 'Project created successfully! Navigating to project...',
          timestamp: new Date()
        });

        // Close dialog immediately
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error creating project:', error);
        this.creating = false;

        // Add error log
        this.logs.push({
          type: 'error',
          data: 'Failed to create project. Please try again.',
          timestamp: new Date()
        });

        // Add error details if available
        if (error instanceof Error) {
          this.logs.push({
            type: 'error',
            data: error.message,
            timestamp: new Date()
          });
        }
      }
    }
  }

  cancel() {
    if (!this.creating || this.canCancel) {
      this.dialogRef.close(false);
    }
  }
}
