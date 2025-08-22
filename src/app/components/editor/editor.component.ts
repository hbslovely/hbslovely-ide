import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorService } from '../../services/editor.service';
import { FileService } from '../../services/file.service';
import { FileNode } from '../../models/file.model';
import { Subscription } from 'rxjs';
import { editor as monacoEditor } from 'monaco-editor';
import loader from '@monaco-editor/loader';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class EditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;

  openFiles: FileNode[] = [];
  activeFileIndex: number = -1;
  private subscription: Subscription = new Subscription();

  constructor(
    private editorService: EditorService,
    private fileService: FileService
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.fileService.getEditorState().subscribe(state => {
        this.openFiles = state.openFiles;
        this.activeFileIndex = state.activeFileIndex;
        
        if (state.currentFile && state.currentFile !== this.openFiles[this.activeFileIndex]) {
          this.loadFile(state.currentFile);
        }
      })
    );
  }

  async ngAfterViewInit() {
    await loader.init();
    this.editorService.initializeEditor(this.editorContainer.nativeElement);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.editorService.dispose();
  }

  private loadFile(file: FileNode) {
    this.editorService.setContent(file.content || '');
    this.editorService.setLanguage(file);
  }

  closeFile(index: number) {
    this.fileService.closeFile(index);
  }
}
