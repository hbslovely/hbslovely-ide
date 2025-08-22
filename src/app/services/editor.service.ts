import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { editor as monacoEditor, Position, IPosition, Range, IRange, languages as monacoLanguages } from 'monaco-editor';
import { FileNode } from '../models/file.model';

interface EditorOptions extends monacoEditor.IStandaloneEditorConstructionOptions {
  automaticLayout: boolean;
  theme: string;
  fontSize: number;
  fontFamily: string;
  lineNumbers: 'on' | 'off' | 'relative';
  minimap: { enabled: boolean };
  scrollBeyondLastLine: boolean;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  formatOnPaste: boolean;
  formatOnType: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EditorService {
  private editor: monacoEditor.IStandaloneCodeEditor | null = null;
  private decorations: string[] = [];
  private formatOnSave = true;
  private editorOptions: EditorOptions = {
    automaticLayout: true,
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: 'Fira Code, JetBrains Mono, monospace',
    lineNumbers: 'on',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true,
    tabSize: 2,
    insertSpaces: true,
    detectIndentation: true,
    rulers: [80, 120],
    bracketPairColorization: { enabled: true },
    renderWhitespace: 'selection',
    suggestSelection: 'first',
    quickSuggestions: true,
    quickSuggestionsDelay: 10,
    snippetSuggestions: 'inline',
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      alwaysConsumeMouseWheel: false
    },
    parameterHints: { enabled: true },
    folding: true,
    foldingStrategy: 'indentation',
    matchBrackets: 'always',
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'always',
      seedSearchStringFromSelection: 'always'
    }
  };

  private cursorPosition = new BehaviorSubject<IPosition | null>(null);
  private selectedText = new BehaviorSubject<string>('');
  private diagnostics = new BehaviorSubject<monacoEditor.IMarker[]>([]);

  constructor(private ngZone: NgZone) {
    this.configureMonaco();
  }

  private configureMonaco() {
    // Configure Monaco editor settings
    monacoLanguages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false
    });

    monacoLanguages.typescript.typescriptDefaults.setCompilerOptions({
      target: monacoLanguages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monacoLanguages.typescript.ModuleResolutionKind.NodeJs,
      module: monacoLanguages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monacoLanguages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types']
    });

    // Add custom themes
    monacoEditor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'regexp', foreground: 'D16969' }
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2A2A2A',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41'
      }
    });
  }

  initializeEditor(container: HTMLElement): void {
    if (!this.editor) {
      this.editor = monacoEditor.create(container, this.editorOptions);
      this.setupEditorEvents();
    }
  }

  private setupEditorEvents() {
    if (!this.editor) return;

    // Cursor position changes
    this.editor.onDidChangeCursorPosition(e => {
      this.ngZone.run(() => {
        this.cursorPosition.next(e.position);
      });
    });

    // Selection changes
    this.editor.onDidChangeCursorSelection(e => {
      this.ngZone.run(() => {
        const selection = this.editor?.getModel()?.getValueInRange(e.selection) || '';
        this.selectedText.next(selection);
      });
    });

    // Model changes
    this.editor.onDidChangeModelContent(() => {
      this.validateContent();
    });
  }

  setContent(content: string, language?: string): void {
    if (this.editor) {
      const model = monacoEditor.createModel(content, language);
      this.editor.setModel(model);
      this.validateContent();
    }
  }

  getContent(): string {
    return this.editor?.getValue() || '';
  }

  async formatDocument(): Promise<void> {
    if (this.editor) {
      const action = this.editor.getAction('editor.action.formatDocument');
      if (action) {
        await action.run();
      }
    }
  }

  setLanguage(file: FileNode): void {
    const extension = file.extension?.toLowerCase() || '';
    let language = 'plaintext';

    switch (extension) {
      case 'js':
        language = 'javascript';
        break;
      case 'ts':
        language = 'typescript';
        break;
      case 'jsx':
        language = 'javascript';
        break;
      case 'tsx':
        language = 'typescript';
        break;
      case 'html':
        language = 'html';
        break;
      case 'css':
      case 'scss':
      case 'sass':
      case 'less':
        language = 'css';
        break;
      case 'json':
        language = 'json';
        break;
      case 'md':
        language = 'markdown';
        break;
      case 'py':
        language = 'python';
        break;
      case 'java':
        language = 'java';
        break;
      case 'go':
        language = 'go';
        break;
      case 'rs':
        language = 'rust';
        break;
      case 'php':
        language = 'php';
        break;
      case 'rb':
        language = 'ruby';
        break;
      case 'sh':
      case 'bash':
        language = 'shell';
        break;
      case 'sql':
        language = 'sql';
        break;
      case 'xml':
        language = 'xml';
        break;
      case 'yaml':
      case 'yml':
        language = 'yaml';
        break;
    }

    if (this.editor) {
      monacoEditor.setModelLanguage(this.editor.getModel()!, language);
    }
  }

  setTheme(theme: string): void {
    monacoEditor.setTheme(theme);
  }

  updateOptions(options: Partial<EditorOptions>): void {
    if (this.editor) {
      this.editor.updateOptions({ ...this.editorOptions, ...options });
    }
  }

  addDecoration(range: IRange, className: string): void {
    if (this.editor) {
      const decorations = this.editor.deltaDecorations([], [
        { range, options: { className } }
      ]);
      this.decorations = [...this.decorations, ...decorations];
    }
  }

  clearDecorations(): void {
    if (this.editor) {
      this.decorations = this.editor.deltaDecorations(this.decorations, []);
    }
  }

  toggleFormatOnSave(): void {
    this.formatOnSave = !this.formatOnSave;
  }

  isFormatOnSaveEnabled(): boolean {
    return this.formatOnSave;
  }

  async saveContent(): Promise<void> {
    if (this.formatOnSave) {
      await this.formatDocument();
    }
  }

  undo(): void {
    this.editor?.trigger('keyboard', 'undo', null);
  }

  redo(): void {
    this.editor?.trigger('keyboard', 'redo', null);
  }

  find(): void {
    this.editor?.trigger('keyboard', 'actions.find', null);
  }

  replace(): void {
    this.editor?.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
  }

  goToLine(line: number): void {
    this.editor?.revealLineInCenter(line);
    this.editor?.setPosition({ lineNumber: line, column: 1 });
  }

  foldAll(): void {
    this.editor?.trigger('keyboard', 'editor.foldAll', null);
  }

  unfoldAll(): void {
    this.editor?.trigger('keyboard', 'editor.unfoldAll', null);
  }

  private validateContent(): void {
    if (this.editor) {
      const model = this.editor.getModel();
      if (model) {
        const markers = monacoEditor.getModelMarkers({ resource: model.uri });
        this.ngZone.run(() => {
          this.diagnostics.next(markers);
        });
      }
    }
  }

  getCursorPosition(): Observable<IPosition | null> {
    return this.cursorPosition.asObservable();
  }

  getSelectedText(): Observable<string> {
    return this.selectedText.asObservable();
  }

  getDiagnostics(): Observable<monacoEditor.IMarker[]> {
    return this.diagnostics.asObservable();
  }

  dispose(): void {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }
}
