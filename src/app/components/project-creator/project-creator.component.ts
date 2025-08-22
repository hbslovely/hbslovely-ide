import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProjectService } from '../../services/project.service';
import { ProjectConfig, ProjectLog } from '../../models/project.model';
import { Subscription } from 'rxjs';

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
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Project</h2>
    <mat-dialog-content>
      <form [formGroup]="projectForm">
        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Project Name</mat-label>
          <input matInput formControlName="name" placeholder="my-project">
          <mat-error *ngIf="projectForm.get('name')?.errors?.['required']">
            Project name is required
          </mat-error>
          <mat-error *ngIf="projectForm.get('name')?.errors?.['pattern']">
            Project name can only contain lowercase letters, numbers, and hyphens
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Project description"></textarea>
        </mat-form-field>

        <mat-form-field appearance="fill" class="full-width">
          <mat-label>Framework</mat-label>
          <mat-select formControlName="framework">
            <mat-option value="angular">Angular</mat-option>
            <mat-option value="react">React</mat-option>
          </mat-select>
        </mat-form-field>

        <div formGroupName="config" class="config-options">
          <ng-container *ngIf="projectForm.get('framework')?.value === 'angular'">
            <mat-checkbox formControlName="routing">Add routing</mat-checkbox>
            <mat-checkbox formControlName="standalone">Use standalone components</mat-checkbox>
            <mat-checkbox formControlName="strict">Enable strict mode</mat-checkbox>
            <mat-checkbox formControlName="ssr">Enable SSR</mat-checkbox>
          </ng-container>
          <ng-container *ngIf="projectForm.get('framework')?.value === 'react'">
            <mat-checkbox formControlName="typescript">Use TypeScript</mat-checkbox>
            <mat-checkbox formControlName="eslint">Add ESLint</mat-checkbox>
            <mat-checkbox formControlName="tailwind">Add Tailwind CSS</mat-checkbox>
          </ng-container>
        </div>

        <div *ngIf="isLoading" class="progress-section">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <div class="logs-container">
            <div *ngFor="let log of logs" [ngClass]="'log-' + log.type">
              {{ log.data }}
            </div>
          </div>
        </div>

        <div *ngIf="error" class="error-message">
          {{ error }}
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()" [disabled]="isLoading">Cancel</button>
      <button mat-raised-button color="primary" (click)="create()" [disabled]="!projectForm.valid || isLoading">
        Create Project
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 600px;
    }
    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }
    .config-options {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 1rem 0;
    }
    .progress-section {
      margin: 1rem 0;
    }
    .logs-container {
      margin-top: 1rem;
      max-height: 200px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
      padding: 0.5rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    .log-stdout {
      color: #333;
    }
    .log-stderr {
      color: #f44336;
    }
    .log-info {
      color: #2196f3;
    }
    .log-error {
      color: #f44336;
      font-weight: bold;
    }
    .error-message {
      color: #f44336;
      margin: 1rem 0;
    }
  `]
})
export class ProjectCreatorComponent implements OnInit, OnDestroy {
  projectForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  logs: ProjectLog[] = [];
  private logSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProjectCreatorComponent>,
    private projectService: ProjectService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern('^[a-z0-9-]+$')]],
      description: [''],
      framework: ['angular', Validators.required],
      config: this.fb.group({
        routing: [true],
        standalone: [true],
        strict: [true],
        ssr: [false]
      })
    });
  }

  ngOnInit() {
    this.projectForm.get('framework')?.valueChanges.subscribe(framework => {
      const configGroup = this.projectForm.get('config') as FormGroup;
      
      if (framework === 'angular') {
        configGroup.setControl('routing', this.fb.control(true));
        configGroup.setControl('standalone', this.fb.control(true));
        configGroup.setControl('strict', this.fb.control(true));
        configGroup.setControl('ssr', this.fb.control(false));
        configGroup.removeControl('typescript');
        configGroup.removeControl('eslint');
        configGroup.removeControl('tailwind');
      } else {
        configGroup.removeControl('routing');
        configGroup.removeControl('standalone');
        configGroup.removeControl('strict');
        configGroup.removeControl('ssr');
        configGroup.setControl('typescript', this.fb.control(true));
        configGroup.setControl('eslint', this.fb.control(true));
        configGroup.setControl('tailwind', this.fb.control(false));
      }
    });

    // Subscribe to project logs
    this.logSubscription = this.projectService.getProjectLogs().subscribe(log => {
      this.logs.push(log);
      // Auto-scroll to bottom
      setTimeout(() => {
        const container = document.querySelector('.logs-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
  }

  async create() {
    if (this.projectForm.valid) {
      this.isLoading = true;
      this.error = null;
      this.logs = [];

      try {
        const formValue = this.projectForm.value;
        const config: ProjectConfig = {
          name: formValue.name,
          description: formValue.description,
          framework: formValue.framework,
          ...formValue.config
        };

        await this.projectService.createProject(config);
        this.dialogRef.close(true);
      } catch (error) {
        console.error('Error creating project:', error);
        this.error = error instanceof Error ? error.message : 'Failed to create project';
      } finally {
        this.isLoading = false;
      }
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
} 