import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';
import { EditorService } from '../../services/editor.service';
import { FileNode } from '../../models/file.model';
import { Subscription } from 'rxjs';

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
  `]
})
export class EditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  private editorSubscription?: Subscription;
  private initialized = false;

  constructor(
    private fileService: FileService,
    private editorService: EditorService
  ) {}

  ngOnInit() {
    this.editorSubscription = this.fileService.getEditorState().subscribe(state => {
      if (state.currentFile && this.initialized) {
        this.openFile(state.currentFile);
      }
    });
  }

  async ngAfterViewInit() {
    await this.editorService.initializeEditor(this.editorContainer.nativeElement);
    this.initialized = true;

    // Check if there's a current file to open
    const state = await this.fileService.getEditorState().value;
    if (state.currentFile) {
      await this.openFile(state.currentFile);
    }
  }

  ngOnDestroy() {
    if (this.editorSubscription) {
      this.editorSubscription.unsubscribe();
    }
    this.editorService.dispose();
  }

  private async openFile(file: FileNode) {
    if (file.content !== undefined) {
      this.editorService.setContent(file.content);
      this.editorService.setLanguage(file.path);
    }
  }
}
