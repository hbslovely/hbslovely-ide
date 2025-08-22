import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, ProjectLog } from '../../services/project.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="console-container">
      <div class="console-header">
        <div class="log-filters">
          <button class="filter-btn" [class.active]="showLogType('stdout')" (click)="toggleLogType('stdout')">
            Output
          </button>
          <button class="filter-btn" [class.active]="showLogType('stderr')" (click)="toggleLogType('stderr')">
            Errors
          </button>
          <button class="filter-btn" [class.active]="showLogType('info')" (click)="toggleLogType('info')">
            Info
          </button>
        </div>
        <button class="action-button" (click)="clearLogs()">Clear</button>
      </div>
      <div class="console-output" #outputContainer>
        <div *ngFor="let log of filteredLogs" class="log-entry" [class]="log.type">
          <span class="timestamp">{{ log.timestamp | date:'HH:mm:ss' }}</span>
          <span class="message" [class]="log.type">{{ log.data }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .console-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #1e1e1e;
      color: #d4d4d4;
    }

    .console-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: #252526;
      border-bottom: 1px solid #333;
    }

    .log-filters {
      display: flex;
      gap: 8px;
    }

    .filter-btn {
      padding: 4px 8px;
      background: none;
      border: none;
      color: #ccc;
      cursor: pointer;
      font-size: 12px;
      border-radius: 3px;

      &:hover {
        background: #2a2d2e;
      }

      &.active {
        background: #094771;
        color: #fff;
      }
    }

    .console-output {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
    }

    .log-entry {
      display: flex;
      gap: 8px;
      padding: 2px 0;
      white-space: pre-wrap;
      word-break: break-all;

      .timestamp {
        color: #666;
        user-select: none;
      }

      &.stdout .message {
        color: #d4d4d4;
      }

      &.stderr .message {
        color: #f48771;
      }

      &.info .message {
        color: #75beff;
      }

      &.error .message {
        color: #f48771;
        font-weight: bold;
      }
    }
  `]
})
export class ConsoleComponent implements OnInit, OnDestroy {
  logs: ProjectLog[] = [];
  filteredLogs: ProjectLog[] = [];
  activeLogTypes: Set<ProjectLog['type']> = new Set(['stdout', 'stderr', 'info']);
  private subscription: Subscription = new Subscription();

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    this.subscription.add(
      this.projectService.getProjectLogs().subscribe(log => {
        this.logs.push(log);
        this.filterLogs();
        this.scrollToBottom();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  showLogType(type: ProjectLog['type']): boolean {
    return this.activeLogTypes.has(type);
  }

  toggleLogType(type: ProjectLog['type']) {
    if (this.activeLogTypes.has(type)) {
      this.activeLogTypes.delete(type);
    } else {
      this.activeLogTypes.add(type);
    }
    this.filterLogs();
  }

  clearLogs() {
    this.logs = [];
    this.filterLogs();
  }

  private filterLogs() {
    this.filteredLogs = this.logs.filter(log => this.activeLogTypes.has(log.type));
  }

  private scrollToBottom() {
    setTimeout(() => {
      const outputContainer = document.querySelector('.console-output');
      if (outputContainer) {
        outputContainer.scrollTop = outputContainer.scrollHeight;
      }
    });
  }
}
