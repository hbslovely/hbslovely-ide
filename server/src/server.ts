import express from 'express';
import { Server as WebSocketServer } from 'ws';
import { createServer } from 'http';
import { spawn } from 'child_process';
import { join } from 'path';
import cors from 'cors';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 4000;
const PROJECTS_DIR = join(__dirname, '../projects');

// Ensure projects directory exists
if (!existsSync(PROJECTS_DIR)) {
  mkdirSync(PROJECTS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());

// WebSocket connections store
const connections = new Map<string, WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  let projectId: string;

  ws.on('message', (message: string) => {
    const data = JSON.parse(message);
    if (data.type === 'init') {
      projectId = data.projectId;
      connections.set(projectId, ws);
    }
  });

  ws.on('close', () => {
    if (projectId) {
      connections.delete(projectId);
    }
  });
});

// Helper function to send logs to WebSocket clients
function sendLog(projectId: string, type: 'stdout' | 'stderr' | 'info' | 'error', data: string) {
  const ws = connections.get(projectId);
  if (ws) {
    ws.send(JSON.stringify({ type, data }));
  }
}

// Helper function to read directory recursively
function readDirRecursive(dir: string, baseDir: string = dir): any[] {
  const files: any[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relativePath = fullPath.replace(baseDir, '');
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push({
        name: entry,
        type: 'directory',
        path: relativePath,
        children: readDirRecursive(fullPath, baseDir)
      });
    } else {
      files.push({
        name: entry,
        type: 'file',
        path: relativePath,
        content: readFileSync(fullPath, 'utf-8')
      });
    }
  }

  return files;
}

// API Routes
app.post('/api/project/create', async (req, res) => {
  const { name, framework, config } = req.body;
  const projectId = uuidv4();
  const projectPath = join(PROJECTS_DIR, projectId);

  try {
    // Create project directory
    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true });
    }
    mkdirSync(projectPath, { recursive: true });

    // Initialize project based on framework
    let command: string;
    let args: string[];

    if (framework === 'angular') {
      command = 'ng';
      args = [
        'new',
        name,
        '--directory=.',
        '--skip-git',
        config.routing ? '--routing' : '--no-routing',
        config.standalone ? '--standalone' : '',
        config.strict ? '--strict' : '--no-strict',
        config.ssr ? '--ssr' : '',
        '--style=scss',
        '--package-manager=npm',
        '--defaults'
      ].filter(Boolean);

      // Install Angular CLI globally if not present
      await new Promise<void>((resolve, reject) => {
        const ngInstall = spawn('npm', [ 'install', '-g', '@angular/cli' ], { cwd: projectPath });

        ngInstall.stdout.on('data', (data) => {
          sendLog(projectId, 'stdout', data.toString());
        });

        ngInstall.stderr.on('data', (data) => {
          sendLog(projectId, 'stderr', data.toString());
        });

        ngInstall.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Angular CLI installation failed with code ${ code }`));
          }
        });
      });
    } else {
      command = 'npx';
      args = [
        'create-react-app',
        name,
        config.typescript ? '--template typescript' : '',
        '--use-npm'
      ].filter(Boolean);
    }

    // Create project
    await new Promise<void>((resolve, reject) => {
      const process = spawn(command, args, { cwd: projectPath });

      process.stdout.on('data', (data) => {
        sendLog(projectId, 'stdout', data.toString());
      });

      process.stderr.on('data', (data) => {
        sendLog(projectId, 'stderr', data.toString());
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Project creation failed with code ${ code }`));
        }
      });
    });

    // Install additional dependencies for React
    if (framework === 'react' && (config.eslint || config.tailwind)) {
      const dependencies = [
        ...(config.eslint ? [ 'eslint' ] : []),
        ...(config.tailwind ? [ 'tailwindcss', 'postcss', 'autoprefixer' ] : [])
      ];

      if (dependencies.length > 0) {
        await new Promise<void>((resolve, reject) => {
          const install = spawn('npm', [ 'install', '--save-dev', ...dependencies ], { cwd: projectPath });

          install.stdout.on('data', (data) => {
            sendLog(projectId, 'stdout', data.toString());
          });

          install.stderr.on('data', (data) => {
            sendLog(projectId, 'stderr', data.toString());
          });

          install.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`Dependency installation failed with code ${ code }`));
            }
          });
        });
      }
    }

    // Read project files
    const files = readDirRecursive(projectPath);

    res.json({
      id: projectId,
      files
    });
  } catch (error) {
    sendLog(projectId, 'error', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/project/:id/install', async (req, res) => {
  const { id } = req.params;
  const projectPath = join(PROJECTS_DIR, id);

  try {
    const process = spawn('npm', [ 'install' ], { cwd: projectPath });

    process.stdout.on('data', (data) => {
      sendLog(id, 'stdout', data.toString());
    });

    process.stderr.on('data', (data) => {
      sendLog(id, 'stderr', data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true });
      } else {
        throw new Error(`npm install failed with code ${ code }`);
      }
    });
  } catch (error) {
    sendLog(id, 'error', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/project/:id/serve', async (req, res) => {
  const { id } = req.params;
  const projectPath = join(PROJECTS_DIR, id);

  try {
    const process = spawn('npm', [ 'start' ], { cwd: projectPath });

    process.stdout.on('data', (data) => {
      sendLog(id, 'stdout', data.toString());
    });

    process.stderr.on('data', (data) => {
      sendLog(id, 'stderr', data.toString());
    });

    // Don't wait for the process to complete since it's a long-running server
    res.json({ success: true });
  } catch (error) {
    sendLog(id, 'error', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/project/:id/build', async (req, res) => {
  const { id } = req.params;
  const projectPath = join(PROJECTS_DIR, id);

  try {
    const process = spawn('npm', [ 'run', 'build' ], { cwd: projectPath });

    process.stdout.on('data', (data) => {
      sendLog(id, 'stdout', data.toString());
    });

    process.stderr.on('data', (data) => {
      sendLog(id, 'stderr', data.toString());
    });

    process.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true });
      } else {
        throw new Error(`build failed with code ${ code }`);
      }
    });
  } catch (error) {
    sendLog(id, 'error', error.message);
    res.status(500).json({ error: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${ PORT }`);
});
