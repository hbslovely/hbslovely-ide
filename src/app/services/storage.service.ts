import { Injectable } from '@angular/core';
import { FileNode } from '../models/file.model';
import { Project } from './project.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'webIdeDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  private initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: ['projectId', 'path'] });
          filesStore.createIndex('by_project', 'projectId');
          filesStore.createIndex('by_path', 'path');
          filesStore.createIndex('by_updated', 'updatedAt');
        }
      };
    });
  }

  private async waitForInitialization(): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }
  }

  async saveProject(project: Project): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');
      const request = store.put(project);

      request.onerror = () => reject(new Error('Failed to save project'));
      request.onsuccess = () => resolve();
    });
  }

  async getProject(projectId: string): Promise<Project | null> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(projectId);

      request.onerror = () => reject(new Error('Failed to get project'));
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async saveFile(projectId: string, file: FileNode): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const fileData = {
        projectId,
        ...file,
        updatedAt: new Date()
      };
      const request = store.put(fileData);

      request.onerror = () => reject(new Error('Failed to save file'));
      request.onsuccess = () => resolve();
    });
  }

  async saveFiles(projectId: string, files: FileNode[]): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');

      let completed = 0;
      let failed = false;

      files.forEach(file => {
        const fileData = {
          projectId,
          ...file,
          updatedAt: new Date()
        };
        const request = store.put(fileData);

        request.onerror = () => {
          failed = true;
          reject(new Error('Failed to save files'));
        };

        request.onsuccess = () => {
          completed++;
          if (completed === files.length && !failed) {
            resolve();
          }
        };
      });
    });
  }

  async getFile(projectId: string, path: string): Promise<FileNode | null> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const request = store.get([projectId, path]);

      request.onerror = () => reject(new Error('Failed to get file'));
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          const { projectId, updatedAt, ...fileData } = result;
          resolve(fileData);
        } else {
          resolve(null);
        }
      };
    });
  }

  async deleteFile(projectId: string, path: string): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');
      const request = store.delete([projectId, path]);

      request.onerror = () => reject(new Error('Failed to delete file'));
      request.onsuccess = () => resolve();
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['projects', 'files'], 'readwrite');
      
      // Delete project metadata
      const projectsStore = transaction.objectStore('projects');
      const projectRequest = projectsStore.delete(projectId);

      projectRequest.onerror = () => reject(new Error('Failed to delete project'));

      // Delete all project files
      const filesStore = transaction.objectStore('files');
      const filesIndex = filesStore.index('by_project');
      const filesRequest = filesIndex.openCursor(IDBKeyRange.only(projectId));

      filesRequest.onerror = () => reject(new Error('Failed to delete project files'));
      filesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
    });
  }

  async searchFiles(projectId: string, query: string): Promise<FileNode[]> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('by_project');
      const request = index.openCursor(IDBKeyRange.only(projectId));
      const results: FileNode[] = [];

      request.onerror = () => reject(new Error('Failed to search files'));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const { projectId, updatedAt, ...fileData } = cursor.value;
          if (
            fileData.path.toLowerCase().includes(query.toLowerCase()) ||
            fileData.content?.toLowerCase().includes(query.toLowerCase())
          ) {
            results.push(fileData);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }

  async getRecentFiles(projectId: string, limit: number = 10): Promise<FileNode[]> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const index = store.index('by_updated');
      const request = index.openCursor(null, 'prev');
      const results: FileNode[] = [];

      request.onerror = () => reject(new Error('Failed to get recent files'));
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && results.length < limit) {
          const { projectId: fileProjectId, updatedAt, ...fileData } = cursor.value;
          if (fileProjectId === projectId) {
            results.push(fileData);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }
} 