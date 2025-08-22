import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import * as monaco from 'monaco-editor';
import { EditorService, OpenedFile } from '../../services/editor.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private subscriptions: Subscription[] = [];
  openedFiles: OpenedFile[] = [];
  selectedTabIndex = 0;

  constructor(private editorService: EditorService) {}

  ngOnInit() {
    // Subscribe to opened files changes
    this.subscriptions.push(
      this.editorService.getOpenedFiles().subscribe(files => {
        this.openedFiles = files;
      })
    );

    // Subscribe to active file changes
    this.subscriptions.push(
      this.editorService.getActiveFile().subscribe(file => {
        if (file && this.editor) {
          // Update selected tab index
          const index = this.openedFiles.findIndex(f => f.id === file.id);
          if (index !== -1) {
            this.selectedTabIndex = index;
          }

          // Update editor content
          const model = monaco.editor.createModel(
            file.content,
            this.getLanguageFromFileName(file.name)
          );
          this.editor.setModel(model);

          // Set up content change listener
          model.onDidChangeContent(() => {
            this.editorService.updateFileContent(file.id, model.getValue());
          });
        }
      })
    );
  }

  ngAfterViewInit() {
    this.initMonaco();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private initMonaco() {
    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: {
        enabled: true
      },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', monospace",
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        vertical: 'visible',
        horizontal: 'visible',
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        arrowSize: 30
      }
    });
  }

  private getLanguageFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
      'ts': 'typescript',
      'js': 'javascript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'kt': 'kotlin',
      'swift': 'swift',
      'dart': 'dart',
      'vue': 'vue',
      'jsx': 'javascript',
      'tsx': 'typescript'
    };
    return languageMap[ext] || 'plaintext';
  }

  onTabChange(index: number) {
    const file = this.openedFiles[index];
    if (file) {
      this.editorService.activateFile(file.id);
    }
  }

  closeTab(fileId: string, event: MouseEvent) {
    event.stopPropagation();  // Prevent tab selection
    this.editorService.closeFile(fileId);
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const iconMap: { [key: string]: string } = {
      'ts': 'code',
      'js': 'javascript',
      'html': 'html',
      'css': 'css',
      'scss': 'style',
      'json': 'data_object',
      'md': 'article',
      'py': 'code',
      'java': 'code',
      'cpp': 'code',
      'c': 'code',
      'go': 'code',
      'rs': 'code',
      'php': 'code',
      'rb': 'code',
      'sh': 'terminal',
      'yaml': 'settings',
      'yml': 'settings',
      'xml': 'code',
      'sql': 'storage',
      'kt': 'code',
      'swift': 'code',
      'dart': 'code',
      'vue': 'web',
      'jsx': 'javascript',
      'tsx': 'code'
    };
    return iconMap[ext] || 'description';
  }

  getFileIconClass(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return `icon-${ext}`;
  }
}
