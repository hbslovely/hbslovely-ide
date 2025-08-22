import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Constants
const DEFAULT_PORT = 4000;
const TEMP_DIR = path.join(os.tmpdir(), 'web-ide-temp');
const PROJECTS_DIR = path.join(__dirname, '../projects');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create necessary directories
[TEMP_DIR, PROJECTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Store WebSocket connections
const clients = new Map<string, WebSocket>();

// Handle WebSocket connections
wss.on('connection', (ws: WebSocket, projectId: string) => {
  clients.set(projectId, ws);

  ws.on('close', () => {
    clients.delete(projectId);
  });
});

// Helper function to send log message
function sendLog(ws: WebSocket | undefined, type: 'stdout' | 'stderr' | 'info' | 'error', data: string) {
  if (ws) {
    ws.send(JSON.stringify({
      type,
      data,
      timestamp: new Date()
    }));
  }
}

// Helper function to check if a command exists
function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const isWindows = process?.platform === 'win32';
    const checkCommand = isWindows ? `where ${command}` : `which ${command}`;
    
    exec(checkCommand, (error) => {
      resolve(!error);
    });
  });
}

// Helper function to get environment variables
function getEnv(): NodeJS.ProcessEnv {
  return {
    ...process?.env,
    NODE_ENV: 'development',
    FORCE_COLOR: 'true'
  };
}

// Helper function to run a command and stream output
async function runCommand(command: string, args: string[], cwd: string, ws?: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    sendLog(ws, 'info', `Running command: ${command} ${args.join(' ')}`);
    
    const childProcess = spawn(command, args, {
      cwd,
      shell: true,
      env: getEnv()
    });

    childProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(output);
      sendLog(ws, 'stdout', output);
    });

    childProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.error(output);
      sendLog(ws, 'stderr', output);
    });

    childProcess.on('error', (error) => {
      console.error('Process error:', error);
      sendLog(ws, 'error', `Process error: ${error.message}`);
      reject(error);
    });

    childProcess.on('close', (code) => {
      if (code === 0) {
        sendLog(ws, 'info', `Command completed successfully`);
        resolve();
      } else {
        const error = new Error(`Process exited with code ${code}`);
        console.error(error.message);
        sendLog(ws, 'error', error.message);
        reject(error);
      }
    });
  });
}

// Helper function to copy directory recursively
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

// Helper function to remove directory recursively
async function removeDir(dir: string): Promise<void> {
  try {
    await fs.promises.rm(dir, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error removing directory ${dir}:`, error);
  }
}

// API Routes
app.post('/api/projects', async (req, res) => {
  const tempProjectDir = path.join(TEMP_DIR, uuidv4());
  const { projectId, name, framework } = req.body;
  const finalProjectDir = path.join(PROJECTS_DIR, projectId);
  const ws = clients.get(projectId);

  try {
    // Create temporary project directory
    fs.mkdirSync(tempProjectDir, { recursive: true });
    sendLog(ws, 'info', `Created temporary directory: ${tempProjectDir}`);

    // Check if Angular CLI is installed
    if (framework === 'angular') {
      const hasNgCli = await commandExists('ng');
      if (!hasNgCli) {
        sendLog(ws, 'info', 'Installing Angular CLI globally...');
        try {
          await runCommand('npm', ['install', '-g', '@angular/cli'], tempProjectDir, ws);
          sendLog(ws, 'info', 'Angular CLI installed successfully');
        } catch (error) {
          console.error('Failed to install Angular CLI:', error);
          sendLog(ws, 'error', 'Failed to install Angular CLI. Will try to use npx instead.');
        }
      }
    }

    // Initialize project based on framework
    if (framework === 'angular') {
      // Try using global ng first, fallback to npx
      try {
        await runCommand('ng', ['new', '.', '--routing', '--style=scss', '--skip-git', '--defaults'], tempProjectDir, ws);
      } catch (error) {
        console.error('Failed to create Angular project with global CLI:', error);
        sendLog(ws, 'info', 'Trying with npx @angular/cli...');
        await runCommand('npx', ['-y', '@angular/cli@17', 'new', '.', '--routing', '--style=scss', '--skip-git', '--defaults'], tempProjectDir, ws);
      }
    } else {
      await runCommand('npx', ['create-react-app', '.'], tempProjectDir, ws);
    }

    // Create final project directory
    if (fs.existsSync(finalProjectDir)) {
      await removeDir(finalProjectDir);
    }
    
    // Copy project from temp to final directory
    sendLog(ws, 'info', 'Copying project files...');
    await copyDir(tempProjectDir, finalProjectDir);

    // Clean up temp directory
    await removeDir(tempProjectDir);
    sendLog(ws, 'info', 'Temporary files cleaned up');

    // Read project files
    sendLog(ws, 'info', 'Reading project files...');
    const files = readDirRecursive(finalProjectDir);
    sendLog(ws, 'info', 'Project creation completed successfully');

    res.json(files);
  } catch (error) {
    console.error('Error creating project:', error);
    // Clean up on error
    await removeDir(tempProjectDir);
    if (fs.existsSync(finalProjectDir)) {
      await removeDir(finalProjectDir);
    }
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create project' });
  }
});

app.post('/api/projects/:projectId/execute', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { command } = req.body;
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const ws = clients.get(projectId);

    await runCommand('npm', command.split(' '), projectDir, ws);

    res.json({ success: true });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to execute command' });
  }
});

// Helper function to read directory recursively
function readDirRecursive(dir: string): any[] {
  const files: any[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push({
        name: entry.name,
        type: 'directory',
        path: fullPath,
        children: readDirRecursive(fullPath)
      });
    } else {
      files.push({
        name: entry.name,
        type: 'file',
        path: fullPath,
        content: fs.readFileSync(fullPath, 'utf-8')
      });
    }
  }

  return files;
}

// Start server
function startServer() {
  const port = typeof process?.env?.PORT === 'string' ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  // Upgrade HTTP server to WebSocket server
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, projectId);
    });
  });

  return server;
}

// Start the server
startServer();
