import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import * as monaco from 'monaco-editor';
import { EditorService, OpenedFile } from '../../services/editor.service';
import { EditorConfigService, EditorConfig } from '../../services/editor-config.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule,
    FormsModule
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private subscriptions: Subscription[] = [];
  private models: Map<string, monaco.editor.ITextModel> = new Map();
  private autoSaveDebounceTimeout: any;
  openedFiles: OpenedFile[] = [];
  selectedTabIndex = 0;
  config: EditorConfig;

  constructor(
    private editorService: EditorService,
    private editorConfigService: EditorConfigService,
    private snackBar: MatSnackBar
  ) {
    this.config = this.editorConfigService.getCurrentConfig();
  }

  ngOnInit() {
    // Subscribe to config changes
    this.subscriptions.push(
      this.editorConfigService.getConfig().subscribe(config => {
        this.config = config;
        this.updateEditorOptions();
      })
    );

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

          // Get or create model for this file
          let model = this.models.get(file.id);
          if (!model) {
            model = monaco.editor.createModel(
              file.content,
              this.getLanguageFromFileName(file.name)
            );
            this.models.set(file.id, model);

            // Set up content change listener
            model.onDidChangeContent(() => {
              if (this.config.autoSave) {
                // Debounce auto-save to avoid too frequent updates
                if (this.autoSaveDebounceTimeout) {
                  clearTimeout(this.autoSaveDebounceTimeout);
                }
                this.autoSaveDebounceTimeout = setTimeout(async () => {
                  await this.saveCurrentFile();
                }, 1000);
              } else {
                this.editorService.updateFileContent(file.id, model!.getValue());
              }
            });
          } else {
            // Update model content if it's different
            if (model.getValue() !== file.content) {
              const position = this.editor.getPosition();
              model.setValue(file.content);
              if (position) {
                this.editor.setPosition(position);
              }
            }
          }

          // Set the model as active
          this.editor.setModel(model);
        }
      })
    );
  }

  ngAfterViewInit() {
    this.initMonaco();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Clear auto-save timeout
    if (this.autoSaveDebounceTimeout) {
      clearTimeout(this.autoSaveDebounceTimeout);
    }

    // Dispose all models
    this.models.forEach(model => model.dispose());
    this.models.clear();

    if (this.editor) {
      this.editor.dispose();
    }
  }

  private initMonaco() {
    // Configure Monaco editor
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      allowJs: true,
      typeRoots: ["node_modules/@types"]
    });

    // Create editor instance
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
      },
      quickSuggestions: this.config.autoComplete,
      suggestOnTriggerCharacters: this.config.autoComplete,
      tabSize: this.config.tabSize,
      insertSpaces: this.config.insertSpaces
    });

    // Add keyboard shortcuts
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      this.saveCurrentFile();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      this.saveAllFiles();
    });

    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      this.formatDocument();
    });
  }

  private updateEditorOptions() {
    if (this.editor) {
      this.editor.updateOptions({
        quickSuggestions: this.config.autoComplete,
        suggestOnTriggerCharacters: this.config.autoComplete,
        tabSize: this.config.tabSize,
        insertSpaces: this.config.insertSpaces
      });
    }
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
    
    // Dispose the model
    const model = this.models.get(fileId);
    if (model) {
      model.dispose();
      this.models.delete(fileId);
    }

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

  toggleAutoSave() {
    this.editorConfigService.toggleAutoSave();
  }

  toggleAutoComplete() {
    this.editorConfigService.toggleAutoComplete();
  }

  formatDocument() {
    const editor = this.editor;
    if (!editor) return;

    const action = editor.getAction('editor.action.formatDocument');
    if (!action) return;

    action.run();
  }

  async saveCurrentFile() {
    const activeFile = this.openedFiles[this.selectedTabIndex];
    if (!activeFile) return;

    const success = await this.editorService.saveFile(activeFile.id);
    if (success) {
      this.snackBar.open('File saved', 'Dismiss', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom'
      });
    } else {
      this.snackBar.open('Failed to save file', 'Dismiss', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: 'error-snackbar'
      });
    }
  }

  async saveAllFiles() {
    const success = await this.editorService.saveAllFiles();
    if (success) {
      this.snackBar.open('All files saved', 'Dismiss', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom'
      });
    } else {
      this.snackBar.open('Failed to save some files', 'Dismiss', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: 'error-snackbar'
      });
    }
  }
}
