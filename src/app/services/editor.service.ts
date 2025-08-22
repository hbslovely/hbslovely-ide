import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ProjectService } from './project.service';

export interface OpenedFile {
  id: string;  // Unique ID for the tab
  name: string;
  path: string;
  content: string;
  isDirty?: boolean;
  isSaving?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EditorService {
  private openedFilesSubject = new BehaviorSubject<OpenedFile[]>([]);
  private activeFileSubject = new BehaviorSubject<OpenedFile | null>(null);
  private saveInProgress = new Set<string>();
  private fileContents = new Map<string, string>();  // Cache for file contents

  constructor(private projectService: ProjectService) {}

  getOpenedFiles(): Observable<OpenedFile[]> {
    return this.openedFilesSubject.asObservable();
  }

  getActiveFile(): Observable<OpenedFile | null> {
    return this.activeFileSubject.asObservable();
  }

  openFile(name: string, path: string, content: string) {
    const id = `${path}-${Date.now()}`;
    const newFile: OpenedFile = { id, name, path, content };
    
    // Cache the initial content
    this.fileContents.set(id, content);
    
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

      // Clear the cached content
      this.fileContents.delete(fileId);
    }
  }

  async saveFile(fileId: string): Promise<boolean> {
    // Prevent multiple simultaneous saves of the same file
    if (this.saveInProgress.has(fileId)) {
      return false;
    }

    const openedFiles = this.openedFilesSubject.value;
    const fileIndex = openedFiles.findIndex(f => f.id === fileId);
    
    if (fileIndex === -1) return false;

    const file = openedFiles[fileIndex];
    const latestContent = this.fileContents.get(file.id);
    
    if (!file.isDirty || !latestContent) return true;

    try {
      this.saveInProgress.add(fileId);
      
      // Update file status to saving
      const updatedFiles = [...openedFiles];
      updatedFiles[fileIndex] = { ...file, isSaving: true };
      this.openedFilesSubject.next(updatedFiles);

      // Get current project
      const project = this.projectService.getCurrentProjectValue();
      if (!project) return false;

      // Save file to server with latest content
      await this.projectService.updateFile(project.id, file.path, latestContent);

      // Update file status to saved
      const finalFiles = [...this.openedFilesSubject.value];
      const currentIndex = finalFiles.findIndex(f => f.id === fileId);
      if (currentIndex !== -1) {
        finalFiles[currentIndex] = {
          ...finalFiles[currentIndex],
          content: latestContent,  // Update the file content
          isDirty: false,
          isSaving: false
        };
        this.openedFilesSubject.next(finalFiles);

        // Update active file if needed
        if (this.activeFileSubject.value?.id === fileId) {
          this.activeFileSubject.next(finalFiles[currentIndex]);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      
      // Update file status to show error
      const finalFiles = [...this.openedFilesSubject.value];
      const currentIndex = finalFiles.findIndex(f => f.id === fileId);
      if (currentIndex !== -1) {
        finalFiles[currentIndex] = {
          ...finalFiles[currentIndex],
          isSaving: false
        };
        this.openedFilesSubject.next(finalFiles);
      }

      return false;
    } finally {
      this.saveInProgress.delete(fileId);
    }
  }

  async saveAllFiles(): Promise<boolean> {
    const openedFiles = this.openedFilesSubject.value;
    const dirtyFiles = openedFiles.filter(f => f.isDirty);
    
    if (dirtyFiles.length === 0) return true;

    try {
      await Promise.all(dirtyFiles.map(file => this.saveFile(file.id)));
      return true;
    } catch (error) {
      console.error('Error saving all files:', error);
      return false;
    }
  }

  updateFileContent(fileId: string, content: string) {
    // Update the cached content
    this.fileContents.set(fileId, content);

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

