import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FileNode } from '../models/file.model';

export interface EditorState {
  files: FileNode[];
  openFiles: FileNode[];
  currentFile: FileNode | null;
  activeFileIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private editorState = new BehaviorSubject<EditorState>({
    files: [],
    openFiles: [],
    currentFile: null,
    activeFileIndex: -1
  });

  constructor() {}

  getEditorState(): BehaviorSubject<EditorState> {
    return this.editorState;
  }

  private updateEditorState() {
    this.editorState.next({ ...this.editorState.value });
  }

  openFile(file: FileNode) {
    const state = this.editorState.value;
    const index = state.openFiles.findIndex(f => f.path === file.path);

    if (index === -1) {
      state.openFiles.push(file);
      state.activeFileIndex = state.openFiles.length - 1;
    } else {
      state.activeFileIndex = index;
    }

    state.currentFile = file;
    this.updateEditorState();
  }

  closeFile(index: number) {
    const state = this.editorState.value;
    state.openFiles.splice(index, 1);

    if (state.openFiles.length === 0) {
      state.activeFileIndex = -1;
      state.currentFile = null;
    } else if (index <= state.activeFileIndex) {
      state.activeFileIndex = Math.max(0, state.activeFileIndex - 1);
      state.currentFile = state.openFiles[state.activeFileIndex];
    }

    this.updateEditorState();
  }

  addFile(file: FileNode) {
    const state = this.editorState.value;
    state.files.push(file);
    this.updateEditorState();
  }

  updateFile(file: FileNode) {
    const state = this.editorState.value;
    const index = state.files.findIndex(f => f.path === file.path);
    if (index !== -1) {
      state.files[index] = file;
      
      // Update open files if needed
      const openIndex = state.openFiles.findIndex(f => f.path === file.path);
      if (openIndex !== -1) {
        state.openFiles[openIndex] = file;
        if (state.activeFileIndex === openIndex) {
          state.currentFile = file;
        }
      }

      this.updateEditorState();
    }
  }

  deleteFile(path: string) {
    const state = this.editorState.value;
    state.files = state.files.filter(f => f.path !== path);
    
    const openIndex = state.openFiles.findIndex(f => f.path === path);
    if (openIndex !== -1) {
      this.closeFile(openIndex);
    }

    this.updateEditorState();
  }
}
