import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OpenedFile {
  id: string;  // Unique ID for the tab
  name: string;
  path: string;
  content: string;
  isDirty?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EditorService {
  private openedFilesSubject = new BehaviorSubject<OpenedFile[]>([]);
  private activeFileSubject = new BehaviorSubject<OpenedFile | null>(null);

  getOpenedFiles(): Observable<OpenedFile[]> {
    return this.openedFilesSubject.asObservable();
  }

  getActiveFile(): Observable<OpenedFile | null> {
    return this.activeFileSubject.asObservable();
  }

  openFile(name: string, path: string, content: string) {
    const id = `${path}-${Date.now()}`;
    const newFile: OpenedFile = { id, name, path, content };
    
    // Check if file is already open
    const openedFiles = this.openedFilesSubject.value;
    const existingFile = openedFiles.find(f => f.path === path);
    
    if (!existingFile) {
      // Add new file to opened files
      this.openedFilesSubject.next([...openedFiles, newFile]);
    }
    
    // Set as active file
    this.activeFileSubject.next(existingFile || newFile);
  }

  closeFile(fileId: string) {
    const openedFiles = this.openedFilesSubject.value;
    const index = openedFiles.findIndex(f => f.id === fileId);
    
    if (index !== -1) {
      const newFiles = openedFiles.filter(f => f.id !== fileId);
      this.openedFilesSubject.next(newFiles);
      
      // If we closed the active file, activate the next available file
      if (this.activeFileSubject.value?.id === fileId) {
        const nextFile = newFiles[Math.min(index, newFiles.length - 1)] || null;
        this.activeFileSubject.next(nextFile);
      }
    }
  }

  updateFileContent(fileId: string, content: string) {
    const openedFiles = this.openedFilesSubject.value;
    const fileIndex = openedFiles.findIndex(f => f.id === fileId);
    
    if (fileIndex !== -1) {
      const updatedFiles = [...openedFiles];
      updatedFiles[fileIndex] = {
        ...updatedFiles[fileIndex],
        content,
        isDirty: true
      };
      this.openedFilesSubject.next(updatedFiles);
      
      // Update active file if needed
      if (this.activeFileSubject.value?.id === fileId) {
        this.activeFileSubject.next(updatedFiles[fileIndex]);
      }
    }
  }

  activateFile(fileId: string) {
    const openedFiles = this.openedFilesSubject.value;
    const file = openedFiles.find(f => f.id === fileId);
    if (file) {
      this.activeFileSubject.next(file);
    }
  }
}

