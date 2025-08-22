import { Injectable } from '@angular/core';
import { Project } from '../models/project.model';
import { FileNode } from '../models/file.model';

const DB_NAME = 'web-ide-db';
const PROJECTS_STORE = 'projects';
const FILES_STORE = 'files';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.initializeDB();
  }

  private initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        console.error('Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create projects store
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        }

        // Create files store
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'id' });
          filesStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };
    });
  }

  private async waitForDB(): Promise<IDBDatabase> {
    await this.dbReady;
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async saveProject(project: Project): Promise<void> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROJECTS_STORE, 'readwrite');
      const store = transaction.objectStore(PROJECTS_STORE);

      const request = store.put(project);

      request.onerror = () => {
        console.error('Error saving project:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        // Save current project ID to localStorage
        localStorage.setItem('currentProjectId', project.id);
        resolve();
      };
    });
  }

  async getCurrentProject(): Promise<Project | null> {
    const projectId = localStorage.getItem('currentProjectId');
    if (!projectId) return null;
    return this.getProject(projectId);
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROJECTS_STORE, 'readonly');
      const store = transaction.objectStore(PROJECTS_STORE);
      const request = store.get(id);

      request.onerror = () => {
        console.error('Error getting project:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECTS_STORE, FILES_STORE], 'readwrite');
      
      // Delete project
      const projectStore = transaction.objectStore(PROJECTS_STORE);
      const projectRequest = projectStore.delete(id);

      projectRequest.onerror = () => {
        console.error('Error deleting project:', projectRequest.error);
        reject(projectRequest.error);
      };

      // Delete associated files
      const filesStore = transaction.objectStore(FILES_STORE);
      const filesIndex = filesStore.index('projectId');
      const filesRequest = filesIndex.openKeyCursor(IDBKeyRange.only(id));

      filesRequest.onerror = () => {
        console.error('Error deleting project files:', filesRequest.error);
        reject(filesRequest.error);
      };

      filesRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          filesStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        // Remove from localStorage if it's the current project
        if (localStorage.getItem('currentProjectId') === id) {
          localStorage.removeItem('currentProjectId');
        }
        resolve();
      };
    });
  }

  async saveFiles(projectId: string, files: FileNode[]): Promise<void> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readwrite');
      const store = transaction.objectStore(FILES_STORE);

      files.forEach(file => {
        const fileRecord = {
          id: `${projectId}:${file.path}`,
          projectId,
          ...file
        };
        store.put(fileRecord);
      });

      transaction.onerror = () => {
        console.error('Error saving files:', transaction.error);
        reject(transaction.error);
      };

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  async getFiles(projectId: string): Promise<FileNode[]> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(FILES_STORE, 'readonly');
      const store = transaction.objectStore(FILES_STORE);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onerror = () => {
        console.error('Error getting files:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result.map(({ id, projectId, ...file }) => file));
      };
    });
  }
} 