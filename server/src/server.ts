import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Project storage path
const PROJECTS_DIR = path.join(__dirname, '../projects');

// Ensure projects directory exists
async function ensureProjectsDir() {
  try {
    await fs.access(PROJECTS_DIR);
  } catch {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
  }
}

// Initialize storage
ensureProjectsDir();

// Helper function to run commands
function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    childProcess.on('error', (error) => {
      console.error('Error running command:', error);
      reject(error);
    });

    childProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

// Get project by ID
app.get('/project/:id', async (req, res) => {
  console.log('Navigate to /project/:id');
  try {
    const projectId = req.params.id;
    const projectPath = path.join(PROJECTS_DIR, projectId);

    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Read project metadata
    const metadataPath = path.join(projectPath, 'project.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));

    // Read project files
    const files = await getProjectFiles(projectPath);

    res.json({
      id: projectId,
      ...metadata,
      files
    });
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Create new project
app.post('/project', async (req, res) => {
  try {
    const { name, description, template } = req.body;
    const projectId = uuidv4();
    const projectPath = path.join(PROJECTS_DIR, projectId);

    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });

    // Save project metadata
    const metadata = {
      name,
      description,
      template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Initialize project based on template
    if (template === 'angular') {
      // Create Angular project using ng new
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      await runCommand(npxCmd, [
        '--yes',
        '@angular/cli@latest',
        'new',
        name,
        '--directory=.',
        '--routing=true',
        '--style=scss',
        '--skip-git',
        '--skip-tests',
        '--defaults'
      ], projectPath);
    } else if (template === 'react') {
      // Create React project using create-react-app
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      await runCommand(npxCmd, [
        '--yes',
        'create-react-app',
        '.',
        '--template',
        'typescript'
      ], projectPath);
    }

    // Save metadata after project creation
    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Install additional dependencies
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await runCommand(npmCmd, ['install'], projectPath);

    res.json({
      id: projectId,
      ...metadata
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project file
app.put('/project/:id/file', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: filePath, content } = req.body;
    const projectPath = path.join(PROJECTS_DIR, id);
    const fullPath = path.join(projectPath, filePath);

    // Ensure the file path is within the project directory
    if (!fullPath.startsWith(projectPath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Create directories if they don't exist
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file content
    await fs.writeFile(fullPath, content);

    // Update project metadata
    const metadataPath = path.join(projectPath, 'project.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    metadata.updatedAt = new Date().toISOString();
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Get project file
app.get('/project/:id/file', async (req, res) => {
  try {
    const { id } = req.params;
    const { path: filePath } = req.query;
    const projectPath = path.join(PROJECTS_DIR, id);
    const fullPath = path.join(projectPath, filePath as string);

    // Ensure the file path is within the project directory
    if (!fullPath.startsWith(projectPath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');

    res.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Serve project
app.post('/project/:id/serve', async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = path.join(PROJECTS_DIR, id);

    // Run npm start
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await runCommand(npmCmd, ['start'], projectPath);

    res.json({ success: true });
  } catch (error) {
    console.error('Error serving project:', error);
    res.status(500).json({ error: 'Failed to serve project' });
  }
});

// Build project
app.post('/project/:id/build', async (req, res) => {
  try {
    const { id } = req.params;
    const projectPath = path.join(PROJECTS_DIR, id);

    // Run npm build
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    await runCommand(npmCmd, ['run', 'build'], projectPath);

    res.json({ success: true });
  } catch (error) {
    console.error('Error building project:', error);
    res.status(500).json({ error: 'Failed to build project' });
  }
});

// Helper function to recursively get project files
async function getProjectFiles(dirPath: string, basePath: string = ''): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.join(basePath, entry.name);

      if (entry.name === 'project.json' || entry.name === 'node_modules') {
        return null;
      }

      if (entry.isDirectory()) {
        const children = await getProjectFiles(fullPath, relativePath);
        return {
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children
        };
      } else {
        const stats = await fs.stat(fullPath);
        return {
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          modifiedAt: stats.mtime.toISOString()
        };
      }
    })
  );

  return files.filter(Boolean);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
