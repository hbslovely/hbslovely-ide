import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Project {
  id: string;
  name: string;
  description?: string;
  framework: 'angular' | 'react';
  config: any;
  files: any[];
  createdAt: string;
  updatedAt: string;
}

class JsonDB {
  private dbPath: string;
  private data: { projects: Record<string, Project> };

  constructor() {
    this.dbPath = join(__dirname, '../data/db.json');
    this.ensureDbExists();
    this.data = this.loadData();
  }

  private ensureDbExists() {
    const dbDir = join(__dirname, '../data');
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    if (!existsSync(this.dbPath)) {
      writeFileSync(this.dbPath, JSON.stringify({ projects: {} }, null, 2));
    }
  }

  private loadData() {
    const content = readFileSync(this.dbPath, 'utf-8');
    return JSON.parse(content);
  }

  private saveData() {
    writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  saveProject(project: Project) {
    this.data.projects[project.id] = project;
    this.saveData();
  }

  getProject(id: string): Project | null {
    return this.data.projects[id] || null;
  }

  getAllProjects(): Project[] {
    return Object.values(this.data.projects);
  }

  deleteProject(id: string) {
    delete this.data.projects[id];
    this.saveData();
  }

  updateProject(id: string, updates: Partial<Project>) {
    if (this.data.projects[id]) {
      this.data.projects[id] = {
        ...this.data.projects[id],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveData();
    }
  }

  searchProjects(query: string): Project[] {
    const searchText = query.toLowerCase();
    return Object.values(this.data.projects).filter(project =>
      project.name.toLowerCase().includes(searchText) ||
      project.description?.toLowerCase().includes(searchText)
    );
  }
}

export const db = new JsonDB(); 