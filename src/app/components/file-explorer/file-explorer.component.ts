import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NestedTreeControl } from '@angular/cdk/tree';
import { ProjectService } from '../../services/project.service';
import { EditorService, OpenedFile } from '../../services/editor.service';
import { ProjectFile } from '../../models/project.model';
import { Subscription } from 'rxjs';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  isActive?: boolean;
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
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnDestroy {
  treeControl = new NestedTreeControl<FileNode>(node => node.children);
  dataSource = new MatTreeNestedDataSource<FileNode>();
  private subscriptions: Subscription[] = [];
  private activeFilePath: string | null = null;

  constructor(
    private projectService: ProjectService,
    private editorService: EditorService
  ) {}

  ngOnInit() {
    // Subscribe to project changes
    this.subscriptions.push(
      this.projectService.getCurrentProject().subscribe(project => {
        if (project) {
          this.dataSource.data = this.transformFiles(project.files);
          // Expand all nodes by default
          this.expandAll();
        } else {
          this.dataSource.data = [];
        }
      })
    );

    // Subscribe to active file changes
    this.subscriptions.push(
      this.editorService.getActiveFile().subscribe(file => {
        this.activeFilePath = file?.path || null;
        this.updateActiveFile();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  hasChild = (_: number, node: FileNode) => node.type === 'directory' && !!node.children?.length;

  transformFiles(files: ProjectFile[]): FileNode[] {
    return files.map(file => ({
      name: file.name,
      path: file.path,
      type: file.type,
      children: file.children ? this.transformFiles(file.children) : undefined,
      isActive: file.path === this.activeFilePath
    }));
  }

  async openFile(node: FileNode) {
    if (node.type === 'file') {
      try {
        const project = this.projectService.getCurrentProjectValue();
        if (project) {
          const content = await this.projectService.getFile(project.id, node.path);
          this.editorService.openFile(node.name, node.path, content);
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }
  }

  private expandAll() {
    const expand = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.children) {
          this.treeControl.expand(node);
          expand(node.children);
        }
      });
    };
    expand(this.dataSource.data);
  }

  private updateActiveFile() {
    const updateNodes = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        node.isActive = node.path === this.activeFilePath;
        if (node.children) {
          updateNodes(node.children);
        }
      });
    };
    updateNodes(this.dataSource.data);
    this.dataSource.data = [...this.dataSource.data];
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
