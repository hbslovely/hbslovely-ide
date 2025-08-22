import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NetworkRequest } from '../../models/file.model';
import { NetworkService } from '../../services/network.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-network',
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class NetworkComponent implements OnInit, OnDestroy {
  requests: NetworkRequest[] = [];
  filteredRequests: NetworkRequest[] = [];
  selectedRequest: NetworkRequest | null = null;
  filterText: string = '';
  private subscription: Subscription = new Subscription();

  constructor(private networkService: NetworkService) {}

  ngOnInit() {
    this.subscription.add(
      this.networkService.getRequests().subscribe(requests => {
        this.requests = requests;
        this.filterRequests();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  filterRequests() {
    if (!this.filterText) {
      this.filteredRequests = [...this.requests];
      return;
    }

    const searchText = this.filterText.toLowerCase();
    this.filteredRequests = this.requests.filter(request =>
      request.url.toLowerCase().includes(searchText) ||
      request.method.toLowerCase().includes(searchText) ||
      request.status?.toString().includes(searchText)
    );
  }

  selectRequest(request: NetworkRequest) {
    this.selectedRequest = this.selectedRequest === request ? null : request;
  }

  clearRequests() {
    this.networkService.clearRequests();
  }

  getStatusClass(status: number | undefined): string {
    if (!status) return 'error';
    if (status < 300) return 'success';
    if (status < 400) return 'redirect';
    if (status < 500) return 'client-error';
    return 'server-error';
  }

  formatSize(size: number | undefined): string {
    if (!size) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  formatHeaders(headers: Record<string, string> | undefined): string {
    if (!headers) return '';
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  formatBody(body: any): string {
    if (!body) return '';
    if (typeof body === 'string') return body;
    return JSON.stringify(body, null, 2);
  }
}
