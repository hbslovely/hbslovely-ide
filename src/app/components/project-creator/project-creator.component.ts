import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HttpClient } from '@angular/common/http';
import { ProjectService } from '../../services/project.service';

export interface ProjectConfig {
  name: string;
  framework: 'angular' | 'react';
  description?: string;
  // Angular specific options
  routing?: boolean;
  standalone?: boolean;
  strict?: boolean;
  ssr?: boolean;
  // React specific options
  typescript?: boolean;
  eslint?: boolean;
  tailwind?: boolean;
}

@Component({
  selector: 'app-project-creator',
  templateUrl: './project-creator.component.html',
  styleUrls: ['./project-creator.component.scss'],
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
  ]
})
export class ProjectCreatorComponent implements OnInit {
  projectForm: FormGroup;
  isLoading = false;
  error: string | null = null;
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProjectCreatorComponent>,
    private http: HttpClient,
    private projectService: ProjectService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9-]+$')]],
      description: [''],
      framework: ['angular', Validators.required],
      // Angular options
      routing: [true],
      standalone: [true],
      strict: [true],
      ssr: [false],
      // React options
      typescript: [true],
      eslint: [true],
      tailwind: [false]
    });
  }

  ngOnInit() {
    // Reset form based on framework selection
    this.projectForm.get('framework')?.valueChanges.subscribe(framework => {
      if (framework === 'angular') {
        this.projectForm.patchValue({
          typescript: null,
          eslint: null,
          tailwind: null
        });
      } else {
        this.projectForm.patchValue({
          routing: null,
          standalone: null,
          strict: null,
          ssr: null
        });
      }
    });
  }

  async create() {
    if (this.projectForm.valid) {
      this.isLoading = true;
      this.error = null;

      try {
        const config: ProjectConfig = {
          name: this.projectForm.get('name')?.value,
          framework: this.projectForm.get('framework')?.value,
          description: this.projectForm.get('description')?.value
        };

        if (config.framework === 'angular') {
          config.routing = this.projectForm.get('routing')?.value;
          config.standalone = this.projectForm.get('standalone')?.value;
          config.strict = this.projectForm.get('strict')?.value;
          config.ssr = this.projectForm.get('ssr')?.value;
        } else {
          config.typescript = this.projectForm.get('typescript')?.value;
          config.eslint = this.projectForm.get('eslint')?.value;
          config.tailwind = this.projectForm.get('tailwind')?.value;
        }

        // Create project on server first
        const response = await this.http.post<{ id: string; files: any[] }>(`${this.API_URL}/project/create`, config).toPromise();

        if (response) {
          // Save project metadata and files locally
          await this.projectService.initializeProject(response.id, config, response.files);
          this.dialogRef.close(true);
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Failed to create project';
      } finally {
        this.isLoading = false;
      }
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
} 