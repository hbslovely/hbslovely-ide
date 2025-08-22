import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { Subscription } from 'rxjs';

interface ConsoleLog {
  type: 'info' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="console-container">
      <div class="console-output" #consoleOutput>
        <div *ngFor="let log of logs" class="log-entry" [class]="log.type">
          <span class="timestamp">{{ log.timestamp | date:'HH:mm:ss' }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-container {
      height: 100%;
      background-color: #1e1e1e;
      color: #d4d4d4;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .console-output {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    }

    .log-entry {
      display: flex;
      gap: 8px;
      padding: 2px 0;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .timestamp {
      color: #666;
      user-select: none;
    }

    .message {
      flex: 1;
    }

    .info {
      color: #9cdcfe;
    }

    .error {
      color: #f14c4c;
    }

    .warning {
      color: #ce9178;
    }
  `]
})
export class ConsoleComponent implements OnInit, OnDestroy {
  @ViewChild('consoleOutput') consoleOutput!: ElementRef;
  logs: ConsoleLog[] = [];
  private subscription?: Subscription;

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    // Add initial log
    this.addLog('info', 'Console ready');

    // Subscribe to project changes
    this.subscription = this.projectService.getCurrentProject().subscribe(project => {
      if (project) {
        this.addLog('info', `Project loaded: ${project.name}`);
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  addLog(type: ConsoleLog['type'], message: string) {
    this.logs.push({
      type,
      message,
      timestamp: new Date()
    });

    // Auto-scroll to bottom
    setTimeout(() => {
      const element = this.consoleOutput.nativeElement;
      element.scrollTop = element.scrollHeight;
    });
  }
}
