import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="preview-container" [class.image-preview]="isImageFile">
      <div class="preview-header">
        <mat-icon>{{ getFileIcon() }}</mat-icon>
        <span class="file-name">{{ fileName }}</span>
      </div>
      <div class="preview-content">
        <ng-container [ngSwitch]="true">
          <!-- Image preview -->
          <ng-container *ngSwitchCase="isImageFile">
            <img [src]="safePreviewUrl" [alt]="fileName" class="preview-image" />
          </ng-container>

          <!-- PDF preview -->
          <ng-container *ngSwitchCase="isPdfFile">
            <iframe [src]="safePreviewUrl" class="preview-pdf"></iframe>
          </ng-container>

          <!-- Video preview -->
          <ng-container *ngSwitchCase="isVideoFile">
            <video controls class="preview-video">
              <source [src]="safePreviewUrl" [type]="getVideoType()">
              Your browser does not support the video tag.
            </video>
          </ng-container>

          <!-- Audio preview -->
          <ng-container *ngSwitchCase="isAudioFile">
            <audio controls class="preview-audio">
              <source [src]="safePreviewUrl" [type]="getAudioType()">
              Your browser does not support the audio tag.
            </audio>
          </ng-container>

          <!-- Default preview -->
          <div *ngSwitchDefault class="no-preview">
            <mat-icon>{{ getFileIcon() }}</mat-icon>
            <p>Preview not available for this file type</p>
          </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .preview-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: #1e1e1e;
      color: #d4d4d4;
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background-color: #252526;
      border-bottom: 1px solid #333;
      height: 40px;

      mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .file-name {
        font-family: 'JetBrains Mono', monospace;
        font-size: 13px;
      }
    }

    .preview-content {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .preview-image {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .preview-pdf {
      width: 100%;
      height: 100%;
      border: none;
    }

    .preview-video {
      max-width: 100%;
      max-height: 100%;
    }

    .preview-audio {
      width: 100%;
      max-width: 500px;
    }

    .no-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #666;
      text-align: center;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }

      p {
        margin: 0;
        font-size: 14px;
      }
    }

    .image-preview .preview-content {
      background-color: #252526;
      background-image: linear-gradient(45deg, #333 25%, transparent 25%),
                        linear-gradient(-45deg, #333 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #333 75%),
                        linear-gradient(-45deg, transparent 75%, #333 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
  `]
})
export class PreviewComponent implements OnChanges {
  @Input() fileName: string = '';
  @Input() fileContent: string = '';
  @Input() filePath: string = '';

  safePreviewUrl: SafeUrl = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fileContent'] || changes['filePath']) {
      this.updatePreviewUrl();
    }
  }

  private updatePreviewUrl() {
    if (this.isImageFile || this.isPdfFile || this.isVideoFile || this.isAudioFile) {
      // For binary files, create a blob URL
      const blob = new Blob([this.fileContent], { type: this.getFileType() });
      const url = URL.createObjectURL(blob);
      this.safePreviewUrl = this.sanitizer.bypassSecurityTrustUrl(url);
    }
  }

  get isImageFile(): boolean {
    const ext = this.getFileExtension().toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].includes(ext);
  }

  get isPdfFile(): boolean {
    return this.getFileExtension().toLowerCase() === '.pdf';
  }

  get isVideoFile(): boolean {
    const ext = this.getFileExtension().toLowerCase();
    return ['.mp4', '.webm', '.ogg'].includes(ext);
  }

  get isAudioFile(): boolean {
    const ext = this.getFileExtension().toLowerCase();
    return ['.mp3', '.wav', '.ogg'].includes(ext);
  }

  private getFileExtension(): string {
    return '.' + (this.fileName.split('.').pop() || '');
  }

  private getFileType(): string {
    const ext = this.getFileExtension().toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  getVideoType(): string {
    const ext = this.getFileExtension().toLowerCase();
    const videoTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg'
    };
    return videoTypes[ext] || '';
  }

  getAudioType(): string {
    const ext = this.getFileExtension().toLowerCase();
    const audioTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg'
    };
    return audioTypes[ext] || '';
  }

  getFileIcon(): string {
    const ext = this.getFileExtension().toLowerCase();
    const iconMap: { [key: string]: string } = {
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.gif': 'gif',
      '.bmp': 'image',
      '.webp': 'image',
      '.svg': 'image',
      '.pdf': 'picture_as_pdf',
      '.mp4': 'movie',
      '.webm': 'movie',
      '.ogg': 'movie',
      '.mp3': 'audiotrack',
      '.wav': 'audiotrack'
    };
    return iconMap[ext] || 'insert_drive_file';
  }
}
