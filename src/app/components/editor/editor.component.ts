import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as monaco from 'monaco-editor';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #editorContainer class="editor-container"></div>
  `,
  styles: [`
    .editor-container {
      width: 100%;
      height: 100%;
    }

    ::ng-deep {
      @font-face {
        font-family: "codicon";
        src: url("/assets/monaco/codicon.ttf") format("truetype");
      }
    }
  `]
})
export class EditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;

  constructor() {}

  ngOnInit() {
    // Initialize Monaco environment
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false
    });
  }

  ngAfterViewInit() {
    this.initMonaco();
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.dispose();
    }
  }

  private initMonaco() {
    if (!this.editorContainer) {
      throw new Error('Editor container not found');
    }

    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: '// Start coding here...',
      language: 'typescript',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: {
        enabled: true
      },
      scrollBeyondLastLine: false,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      lineNumbers: 'on',
      roundedSelection: false,
      scrollbar: {
        useShadows: true,
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
}
