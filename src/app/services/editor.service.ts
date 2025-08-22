import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { editor as monacoEditor, Position, IPosition, Range, IRange, languages } from 'monaco-editor';
import loader from '@monaco-editor/loader';

export interface EditorOptions {
  theme?: string;
  fontSize?: number;
  tabSize?: number;
  insertSpaces?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  minimap?: {
    enabled: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EditorService {
  private editor: monacoEditor.IStandaloneCodeEditor | null = null;
  private cursorPosition = new BehaviorSubject<IPosition>({ lineNumber: 1, column: 1 });
  private selectedText = new BehaviorSubject<string>('');
  private diagnostics = new BehaviorSubject<monacoEditor.IMarkerData[]>([]);
  private contentChangeCallback?: (content: string) => void;
  private contentChangeDebounceTimeout?: any;

  constructor(private ngZone: NgZone) {}

  async initializeEditor(container: HTMLElement): Promise<void> {
    await loader.init();
    
    this.ngZone.runOutsideAngular(() => {
      this.editor = monacoEditor.create(container, {
        theme: 'vs-dark',
        fontSize: 14,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        minimap: {
          enabled: true
        },
        automaticLayout: true
      });

      // Set up event listeners
      this.editor.onDidChangeCursorPosition(e => {
        this.cursorPosition.next(e.position);
      });

      this.editor.onDidChangeCursorSelection(e => {
        const selection = this.editor?.getModel()?.getValueInRange(e.selection) || '';
        this.selectedText.next(selection);
      });

      monacoEditor.onDidChangeMarkers(([uri]) => {
        const markers = monacoEditor.getModelMarkers({ resource: uri });
        this.diagnostics.next(markers);
      });

      // Set up content change listener
      this.editor.onDidChangeModelContent(() => {
        if (this.contentChangeCallback) {
          // Debounce content changes
          if (this.contentChangeDebounceTimeout) {
            clearTimeout(this.contentChangeDebounceTimeout);
          }
          this.contentChangeDebounceTimeout = setTimeout(() => {
            const content = this.editor?.getValue() || '';
            this.contentChangeCallback?.(content);
          }, 500);
        }
      });
    });
  }

  dispose(): void {
    if (this.editor) {
      this.editor.dispose();
      this.editor = null;
    }
  }

  setContent(content: string): void {
    if (this.editor) {
      this.editor.setValue(content);
    }
  }

  getContent(): string {
    return this.editor?.getValue() || '';
  }

  setLanguage(filePath: string): void {
    if (!this.editor) return;

    const extension = filePath.split('.').pop()?.toLowerCase();
    let language: string | undefined;

    switch (extension) {
      case 'ts':
      case 'tsx':
        language = 'typescript';
        break;
      case 'js':
      case 'jsx':
        language = 'javascript';
        break;
      case 'html':
        language = 'html';
        break;
      case 'css':
        language = 'css';
        break;
      case 'scss':
        language = 'scss';
        break;
      case 'json':
        language = 'json';
        break;
      case 'md':
        language = 'markdown';
        break;
      case 'yml':
      case 'yaml':
        language = 'yaml';
        break;
      case 'xml':
        language = 'xml';
        break;
      case 'sh':
      case 'bash':
        language = 'shell';
        break;
      case 'py':
        language = 'python';
        break;
      case 'rb':
        language = 'ruby';
        break;
      case 'java':
        language = 'java';
        break;
      case 'c':
      case 'cpp':
      case 'h':
      case 'hpp':
        language = 'cpp';
        break;
      case 'cs':
        language = 'csharp';
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
      case 'sql':
        language = 'sql';
        break;
      default:
        language = 'plaintext';
    }

    const model = this.editor.getModel();
    if (model) {
      monacoEditor.setModelLanguage(model, language);
    }
  }

  onContentChange(callback: (content: string) => void): void {
    this.contentChangeCallback = callback;
  }

  async formatDocument(): Promise<void> {
    if (this.editor) {
      const action = this.editor.getAction('editor.action.formatDocument');
      if (action) {
        await action.run();
      }
    }
  }

  undo(): void {
    this.editor?.trigger('keyboard', 'undo', null);
  }

  redo(): void {
    this.editor?.trigger('keyboard', 'redo', null);
  }

  find(searchText: string): void {
    this.editor?.trigger('keyboard', 'actions.find', null);
    const findInput = document.querySelector('.monaco-editor .find-widget .input') as HTMLInputElement;
    if (findInput) {
      findInput.value = searchText;
      findInput.dispatchEvent(new Event('input'));
    }
  }

  replace(searchText: string, replaceText: string): void {
    this.editor?.trigger('keyboard', 'actions.find', null);
    const findInput = document.querySelector('.monaco-editor .find-widget .input') as HTMLInputElement;
    const replaceInput = document.querySelector('.monaco-editor .find-widget .replace-input') as HTMLInputElement;
    if (findInput && replaceInput) {
      findInput.value = searchText;
      findInput.dispatchEvent(new Event('input'));
      replaceInput.value = replaceText;
      replaceInput.dispatchEvent(new Event('input'));
    }
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

  validateContent(): void {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    const markers = monacoEditor.getModelMarkers({ resource: model.uri });
    this.diagnostics.next(markers);
  }

  getCursorPosition(): BehaviorSubject<IPosition> {
    return this.cursorPosition;
  }

  getSelectedText(): BehaviorSubject<string> {
    return this.selectedText;
  }

  getDiagnostics(): BehaviorSubject<monacoEditor.IMarkerData[]> {
    return this.diagnostics;
  }

  updateOptions(options: EditorOptions): void {
    if (this.editor) {
      this.editor.updateOptions(options);
    }
  }
}

