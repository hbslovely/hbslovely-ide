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
  templateUrl: './console.component.html',
  styleUrls: ['./console.component.scss']
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
