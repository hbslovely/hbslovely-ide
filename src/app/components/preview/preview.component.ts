import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class PreviewComponent implements OnInit {
  @ViewChild('previewFrame') previewFrame!: ElementRef;
  
  previewUrl: SafeResourceUrl;
  currentDevice: DeviceType = 'desktop';

  constructor(private sanitizer: DomSanitizer) {
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
  }

  ngOnInit() {
    this.updatePreview();
  }

  refresh() {
    this.updatePreview();
  }

  toggleDevice(device: DeviceType) {
    this.currentDevice = device;
  }

  private updatePreview() {
    // Here you would get the current file content and create a preview URL
    const defaultContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Preview</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: 'Source Sans Pro', sans-serif;
              margin: 20px;
              line-height: 1.6;
            }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Preview Window</h1>
          <p>Your content will appear here</p>
        </body>
      </html>
    `;

    const blob = new Blob([defaultContent], { type: 'text/html' });
    this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(blob));
  }
}
