import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NestedTreeControl } from '@angular/cdk/tree';
import { ProjectService } from '../../services/project.service';
import { ProjectFile } from '../../models/project.model';
import { Subscription } from 'rxjs';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  expanded?: boolean;
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
      <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
        <!-- Directory node -->
        <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
          <button mat-icon-button matTreeNodeToggle>
            <mat-icon>
              {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
            </mat-icon>
          </button>
          <mat-icon>folder{{ treeControl.isExpanded(node) ? '_open' : '' }}</mat-icon>
          <span class="node-name">{{ node.name }}</span>
        </mat-tree-node>

        <!-- File node -->
        <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
          <button mat-icon-button disabled></button>
          <mat-icon [class]="getFileIconClass(node.name)">{{ getFileIcon(node.name) }}</mat-icon>
          <span class="node-name" (click)="openFile(node)">{{ node.name }}</span>
        </mat-tree-node>
      </mat-tree>
    </div>
  `,
  styles: [`
    .file-explorer {
      height: 100%;
      background-color: #252526;
      color: #d4d4d4;
      overflow: auto;
    }

    .mat-tree {
      background: transparent;
    }

    .mat-tree-node {
      min-height: 32px;
      cursor: pointer;
      color: #d4d4d4;
    }

    .mat-tree-node:hover {
      background-color: #2a2d2e;
    }

    .mat-tree-node .mat-icon-button {
      width: 24px;
      height: 24px;
      line-height: 24px;
      color: #d4d4d4;
    }

    .mat-tree-node .mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      color: #d4d4d4;
    }

    .node-name {
      font-size: 13px;
      font-family: 'JetBrains Mono', monospace;
    }

    /* File type icons */
    .icon-ts {
      color: #007acc !important;
    }

    .icon-js {
      color: #f7df1e !important;
    }

    .icon-html {
      color: #e44d26 !important;
    }

    .icon-css, .icon-scss {
      color: #264de4 !important;
    }

    .icon-json {
      color: #fbc02d !important;
    }

    .icon-md {
      color: #42a5f5 !important;
    }
  `]
})
export class FileExplorerComponent implements OnInit, OnDestroy {
  treeControl = new NestedTreeControl<FileNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<FileNode>();
  private subscription?: Subscription;

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    this.subscription = this.projectService.getCurrentProject().subscribe(project => {
      if (project) {
        this.dataSource.data = this.transformFiles(project.files);
      } else {
        this.dataSource.data = [];
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  hasChild = (_: number, node: FileNode) => node.type === 'directory' && !!node.children?.length;

  transformFiles(files: ProjectFile[]): FileNode[] {
    return files.map(file => ({
      name: file.name,
      path: file.path,
      type: file.type,
      children: file.children ? this.transformFiles(file.children) : undefined
    }));
  }

  async openFile(node: FileNode) {
    if (node.type === 'file') {
      try {
        const project = this.projectService.getCurrentProjectValue();
        if (project) {
          const content = await this.projectService.getFile(project.id, node.path);
          // Emit event or use a service to open the file in the editor
          console.log('Opening file:', node.path, content);
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'code';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'html':
        return 'html';
      case 'css':
      case 'scss':
      case 'sass':
        return 'css';
      case 'json':
        return 'data_object';
      case 'md':
        return 'article';
      default:
        return 'description';
    }
  }

  getFileIconClass(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'icon-ts';
      case 'js':
      case 'jsx':
        return 'icon-js';
      case 'html':
        return 'icon-html';
      case 'css':
      case 'scss':
      case 'sass':
        return 'icon-css';
      case 'json':
        return 'icon-json';
      case 'md':
        return 'icon-md';
      default:
        return '';
    }
  }
}
