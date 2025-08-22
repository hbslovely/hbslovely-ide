import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileService } from '../../services/file.service';
import { FileNode } from '../../models/file.model';

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.component.html',
  styleUrls: ['./file-explorer.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class FileExplorerComponent implements OnInit {
  files: FileNode[] = [];

  constructor(private fileService: FileService) {}

  ngOnInit() {
    this.fileService.getEditorState().subscribe(state => {
      this.files = state.files;
    });
  }

  handleNodeClick(node: FileNode) {
    if (node.type === "file") {
      this.fileService.openFile(node);
    }
  }

  createNewFile() {
    const newFile: FileNode = {
      name: 'new-file.txt',
      type: "file",
      path: '/new-file.txt',
      content: ''
    };
    this.fileService.addFile(newFile);
  }
}
