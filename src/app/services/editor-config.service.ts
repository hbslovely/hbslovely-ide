import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface EditorConfig {
  autoSave: boolean;
  autoComplete: boolean;
  tabSize: number;
  insertSpaces: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EditorConfigService {
  private configSubject = new BehaviorSubject<EditorConfig>({
    autoSave: true,
    autoComplete: true,
    tabSize: 2,
    insertSpaces: true
  });

  getConfig(): Observable<EditorConfig> {
    return this.configSubject.asObservable();
  }

  getCurrentConfig(): EditorConfig {
    return this.configSubject.value;
  }

  updateConfig(config: Partial<EditorConfig>) {
    this.configSubject.next({
      ...this.configSubject.value,
      ...config
    });
  }

  toggleAutoSave() {
    const currentConfig = this.configSubject.value;
    this.updateConfig({ autoSave: !currentConfig.autoSave });
  }

  toggleAutoComplete() {
    const currentConfig = this.configSubject.value;
    this.updateConfig({ autoComplete: !currentConfig.autoComplete });
  }
} 