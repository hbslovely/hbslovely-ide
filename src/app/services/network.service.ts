import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NetworkRequest } from '../models/file.model';

interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _requestBody?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private requests: NetworkRequest[] = [];
  private requestsSubject = new BehaviorSubject<NetworkRequest[]>([]);

  constructor() {
    this.initializeNetworkCapture();
  }

  getRequests(): Observable<NetworkRequest[]> {
    return this.requestsSubject.asObservable();
  }

  clearRequests() {
    this.requests = [];
    this.requestsSubject.next(this.requests);
  }

  private initializeNetworkCapture() {
    if (typeof window !== 'undefined') {
      this.interceptXHR();
      this.interceptFetch();
      this.setupPerformanceObserver();
    }
  }

  private interceptXHR() {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    const service = this;

    XMLHttpRequest.prototype.open = function(method: string, url: string) {
      const startTime = Date.now();
      
      this.addEventListener('loadend', function(this: ExtendedXMLHttpRequest) {
        const request: NetworkRequest = {
          url: url,
          method: method.toUpperCase(),
          status: this.status,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          headers: service.parseHeaders(this.getAllResponseHeaders()),
          body: this._requestBody,
          response: service.tryParseJSON(this.responseText)
        };

        service.addRequest(request);
      });

      return originalXHROpen.apply(this, arguments as any);
    };

    XMLHttpRequest.prototype.send = function(this: ExtendedXMLHttpRequest, body: any) {
      if (body) {
        try {
          this._requestBody = typeof body === 'string' ? JSON.parse(body) : body;
        } catch {
          this._requestBody = body;
        }
      }
      return originalXHRSend.apply(this, arguments as any);
    };
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    const service = this;

    window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const method = (init?.method || 'GET').toUpperCase();
      const url = typeof input === 'string' ? input : 
                 input instanceof URL ? input.href :
                 input.url;

      return originalFetch.apply(window, arguments as any)
        .then(async response => {
          const responseClone = response.clone();
          const responseBody = await service.getResponseBody(responseClone);
          const request: NetworkRequest = {
            url: url,
            method: method,
            status: response.status,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            headers: service.convertHeadersToObject(response.headers),
            body: init?.body ? service.tryParseJSON(init.body as string) : undefined,
            response: responseBody
          };

          service.addRequest(request);
          return response;
        })
        .catch(error => {
          const request: NetworkRequest = {
            url: url,
            method: method,
            status: 0,
            duration: Date.now() - startTime,
            timestamp: new Date(),
            body: init?.body ? service.tryParseJSON(init.body as string) : undefined,
            response: { error: error.message }
          };

          service.addRequest(request);
          throw error;
        });
    };
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            const request: NetworkRequest = {
              url: resourceEntry.name,
              method: 'GET', // Performance API doesn't provide method info
              duration: resourceEntry.duration,
              timestamp: new Date(resourceEntry.startTime + performance.timeOrigin),
              // Add resource type information
              headers: {
                'Content-Type': this.getResourceContentType(resourceEntry.initiatorType)
              }
            };
            this.addRequest(request);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  private addRequest(request: NetworkRequest) {
    this.requests.unshift(request); // Add to beginning of array
    if (this.requests.length > 100) {
      this.requests.pop(); // Keep only last 100 requests
    }
    this.requestsSubject.next([...this.requests]);
  }

  private parseHeaders(headerStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headerStr) return headers;

    headerStr.split('\r\n').forEach(line => {
      const parts = line.split(': ');
      const header = parts.shift();
      if (header) {
        headers[header] = parts.join(': ');
      }
    });

    return headers;
  }

  private convertHeadersToObject(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private async getResponseBody(response: Response): Promise<any> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text();
      } else {
        return '[Binary Data]';
      }
    } catch {
      return '[Response body cannot be read]';
    }
  }

  private tryParseJSON(str: any): any {
    if (typeof str !== 'string') return str;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  private getResourceContentType(initiatorType: string): string {
    switch (initiatorType) {
      case 'img': return 'image/*';
      case 'script': return 'application/javascript';
      case 'css': return 'text/css';
      case 'fetch':
      case 'xmlhttprequest': return 'application/json';
      default: return 'text/plain';
    }
  }
} 