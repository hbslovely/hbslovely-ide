import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FileNode, EditorState } from '../models/file.model';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private editorState: EditorState = {
    files: [],
    openFiles: [],
    activeFileIndex: -1
  };

  private editorStateSubject = new BehaviorSubject<EditorState>(this.editorState);
  private fileSystemMap = new Map<string, FileNode>();

  constructor() {
    this.initializeFileSystem();
  }

  getEditorState(): Observable<EditorState> {
    return this.editorStateSubject.asObservable();
  }

  private initializeFileSystem() {
    // Create root directory
    const rootDir: FileNode = {
      name: 'root',
      type: "directory",
      path: '/',
      children: []
    };
    this.fileSystemMap.set('/', rootDir);
    this.editorState.files = [rootDir];
    this.updateEditorState();
  }

  addFile(file: FileNode): FileNode | null {
    if (file.type === "directory") {
      this.editorState.files.push(file);
      this.fileSystemMap.set(file.path, file);
      this.updateEditorState();
      return file;
    } else {
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
      const parent = this.fileSystemMap.get(parentPath || '/');
      
      if (!parent || parent.type !== "directory") {
        console.error('Parent directory not found or is not a directory');
        return null;
      }

      if (this.fileSystemMap.has(file.path)) {
        console.error('File already exists');
        return null;
      }

      parent.children = parent.children || [];
      parent.children.push(file);
      file.parent = parent;
      this.fileSystemMap.set(file.path, file);
      this.updateEditorState();
      return file;
    }
  }

  openFile(file: FileNode) {
    if (file.type === "file") {
      const existingIndex = this.editorState.openFiles.findIndex(f => f.path === file.path);
      if (existingIndex === -1) {
        this.editorState.openFiles.push(file);
        this.editorState.activeFileIndex = this.editorState.openFiles.length - 1;
      } else {
        this.editorState.activeFileIndex = existingIndex;
      }
      this.editorState.currentFile = file;
      this.updateEditorState();
    }
  }

  closeFile(index: number) {
    if (index >= 0 && index < this.editorState.openFiles.length) {
      this.editorState.openFiles.splice(index, 1);
      if (this.editorState.activeFileIndex === index) {
        this.editorState.activeFileIndex = Math.max(0, index - 1);
        this.editorState.currentFile = this.editorState.openFiles[this.editorState.activeFileIndex];
      } else if (this.editorState.activeFileIndex > index) {
        this.editorState.activeFileIndex--;
      }
      this.updateEditorState();
    }
  }

  updateFileContent(path: string, content: string) {
    const file = this.fileSystemMap.get(path);
    if (file && file.type === "file") {
      file.content = content;
      this.updateEditorState();
    }
  }

  getFile(path: string): FileNode | undefined {
    return this.fileSystemMap.get(path);
  }

  private updateEditorState() {
    this.editorStateSubject.next({ ...this.editorState });
  }
}
