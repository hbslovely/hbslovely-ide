import { Injectable } from '@angular/core';
import { Project } from '../models/project.model';
import { FileNode } from '../models/file.model';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly DB_NAME = 'web-ide-db';
  private readonly PROJECTS_STORE = 'projects';
  private readonly FILES_STORE = 'files';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  private initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.PROJECTS_STORE)) {
          db.createObjectStore(this.PROJECTS_STORE, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this.FILES_STORE)) {
          const filesStore = db.createObjectStore(this.FILES_STORE, { keyPath: ['projectId', 'path'] });
          filesStore.createIndex('projectId', 'projectId');
          filesStore.createIndex('path', 'path');
          filesStore.createIndex('updatedAt', 'updatedAt');
        }
      };
    });
  }

  async waitForInitialization(): Promise<void> {
    if (this.db) return;
    await this.initializeDB();
  }

  async saveProject(project: Project): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readwrite');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.put(project);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getProject(projectId: string): Promise<Project | null> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.PROJECTS_STORE], 'readonly');
      const store = transaction.objectStore(this.PROJECTS_STORE);
      const request = store.get(projectId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.PROJECTS_STORE, this.FILES_STORE], 'readwrite');
      
      // Delete project
      const projectStore = transaction.objectStore(this.PROJECTS_STORE);
      const projectRequest = projectStore.delete(projectId);
      
      // Delete all files for this project
      const filesStore = transaction.objectStore(this.FILES_STORE);
      const filesIndex = filesStore.index('projectId');
      const filesRequest = filesIndex.openCursor(IDBKeyRange.only(projectId));
      
      filesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveFile(projectId: string, file: FileNode): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readwrite');
      const store = transaction.objectStore(this.FILES_STORE);
      const request = store.put({
        projectId,
        ...file,
        updatedAt: new Date()
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getFile(projectId: string, path: string): Promise<FileNode | null> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readonly');
      const store = transaction.objectStore(this.FILES_STORE);
      const request = store.get([projectId, path]);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async deleteFile(projectId: string, path: string): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readwrite');
      const store = transaction.objectStore(this.FILES_STORE);
      const request = store.delete([projectId, path]);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getAllFiles(projectId: string): Promise<FileNode[]> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readonly');
      const store = transaction.objectStore(this.FILES_STORE);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async saveFiles(projectId: string, files: FileNode[]): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readwrite');
      const store = transaction.objectStore(this.FILES_STORE);

      files.forEach(file => {
        store.put({
          projectId,
          ...file,
          updatedAt: new Date()
        });
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearAllFiles(projectId: string): Promise<void> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readwrite');
      const store = transaction.objectStore(this.FILES_STORE);
      const index = store.index('projectId');
      const request = index.openCursor(IDBKeyRange.only(projectId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async searchFiles(projectId: string, query: string): Promise<FileNode[]> {
    const files = await this.getAllFiles(projectId);
    const searchTerm = query.toLowerCase();
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm) ||
      file.path.toLowerCase().includes(searchTerm) ||
      (file.content && file.content.toLowerCase().includes(searchTerm))
    );
  }

  async getRecentFiles(projectId: string, limit: number = 10): Promise<FileNode[]> {
    await this.waitForInitialization();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.FILES_STORE], 'readonly');
      const store = transaction.objectStore(this.FILES_STORE);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev');

      const files: FileNode[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && files.length < limit && cursor.value.projectId === projectId) {
          files.push(cursor.value);
          cursor.continue();
        } else {
          resolve(files);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
} 