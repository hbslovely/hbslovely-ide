export interface FileNode {
  name: string;
  type: "file" | "directory";
  path: string;
  content?: string;
  children?: FileNode[];
  parent?: FileNode;
  extension?: string;
}

export interface EditorState {
  currentFile?: FileNode;
  files: FileNode[];
  openFiles: FileNode[];
  activeFileIndex: number;
}

export interface ConsoleLog {
  type: "log" | "error" | "warn" | "info";
  message: string;
  timestamp: Date;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  duration: number;
  timestamp: Date;
  headers?: Record<string, string>;
  body?: any;
  response?: any;
} 