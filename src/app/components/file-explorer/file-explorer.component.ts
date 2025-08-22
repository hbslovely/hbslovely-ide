import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NestedTreeControl } from '@angular/cdk/tree';
import { FileService } from '../../services/file.service';
import { ProjectService } from '../../services/project.service';
import { FileNode } from '../../models/file.model';
import { Subscription } from 'rxjs';

interface FileTreeNode extends FileNode {
  children?: FileTreeNode[];
}

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [
    CommonModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="file-explorer">
      <div class="toolbar">
        <button mat-icon-button (click)="refresh()">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>
      <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
        <!-- Leaf node -->
        <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
          <button mat-icon-button disabled>
            <mat-icon>description</mat-icon>
          </button>
          <span (click)="openFile(node)">{{node.name}}</span>
        </mat-tree-node>
        <!-- Expandable node -->
        <mat-nested-tree-node *matTreeNodeDef="let node; when: hasChild">
          <div class="mat-tree-node">
            <button mat-icon-button matTreeNodeToggle>
              <mat-icon>
                {{treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right'}}
              </mat-icon>
            </button>
            <mat-icon>folder{{treeControl.isExpanded(node) ? '_open' : ''}}</mat-icon>
            <span>{{node.name}}</span>
          </div>
          <div class="nested-node" [class.expanded]="treeControl.isExpanded(node)">
            <ng-container matTreeNodeOutlet></ng-container>
          </div>
        </mat-nested-tree-node>
      </mat-tree>
    </div>
  `,
  styles: [`
    .file-explorer {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .toolbar {
      padding: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    mat-tree {
      flex: 1;
      overflow: auto;
    }
    .mat-tree-node {
      min-height: 40px;
      cursor: pointer;
    }
    .nested-node {
      display: none;
    }
    .nested-node.expanded {
      display: block;
      padding-left: 40px;
    }
    span {
      margin-left: 8px;
      cursor: pointer;
    }
    span:hover {
      color: #1976d2;
    }
  `]
})
export class FileExplorerComponent implements OnInit, OnDestroy {
  treeControl = new NestedTreeControl<FileTreeNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<FileTreeNode>();
  private projectSubscription?: Subscription;

  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  ngOnInit() {
    // Subscribe to current project changes
    this.projectSubscription = this.projectService.getCurrentProject().subscribe(project => {
      if (project) {
        this.loadProjectFiles(project.id);
      } else {
        this.dataSource.data = [];
      }
    });
  }

  ngOnDestroy() {
    if (this.projectSubscription) {
      this.projectSubscription.unsubscribe();
    }
  }

  hasChild = (_: number, node: FileTreeNode) => !!node.children && node.children.length > 0;

  async openFile(node: FileTreeNode) {
    if (node.type === 'file') {
      await this.fileService.openFile(node);
    }
  }

  async refresh() {
    const project = this.projectService.getCurrentProject().value;
    if (project) {
      await this.loadProjectFiles(project.id);
    }
  }

  private async loadProjectFiles(projectId: string) {
    try {
      const files = await this.projectService.getRecentFiles(projectId);
      this.dataSource.data = this.buildFileTree(files);
    } catch (error) {
      console.error('Error loading project files:', error);
    }
  }

  private buildFileTree(files: FileNode[]): FileTreeNode[] {
    const root: { [key: string]: FileTreeNode } = {};

    // Sort files to process directories first
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.path.localeCompare(b.path);
    });

    for (const file of sortedFiles) {
      const parts = file.path.split('/').filter(Boolean);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const isFile = file.type === 'file' && isLast;

        if (!current[part]) {
          current[part] = {
            name: part,
            type: isFile ? 'file' : 'directory',
            path: parts.slice(0, i + 1).join('/'),
            children: isFile ? undefined : []
          };

          if (isFile) {
            current[part].content = file.content;
          }
        }

        if (!isLast) {
          const node = current[part];
          if (node.children) {
            current = node.children.reduce((acc, child) => {
              acc[child.name] = child;
              return acc;
            }, {} as { [key: string]: FileTreeNode });
          }
        }
      }
    }

    return Object.values(root);
  }
}
