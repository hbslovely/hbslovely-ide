import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ElementNode {
  tag: string;
  attributes: Record<string, string>;
  computedStyles: Array<{ property: string; value: string }>;
}

@Component({
  selector: 'app-elements-inspector',
  templateUrl: './elements-inspector.component.html',
  styleUrls: ['./elements-inspector.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ElementsInspectorComponent {
  elements: ElementNode[] = [];
  filteredElements: ElementNode[] = [];
  selectedElement: ElementNode | null = null;
  searchText: string = '';

  constructor() {
    // Sample data
    this.elements = [
      {
        tag: 'div',
        attributes: {
          'class': 'container main-content',
          'id': 'app-root'
        },
        computedStyles: [
          { property: 'display', value: 'flex' },
          { property: 'background-color', value: '#ffffff' }
        ]
      },
      {
        tag: 'header',
        attributes: {
          'class': 'page-header'
        },
        computedStyles: [
          { property: 'position', value: 'fixed' },
          { property: 'top', value: '0' }
        ]
      }
    ];
    this.filteredElements = [...this.elements];
  }

  filterElements() {
    if (!this.searchText) {
      this.filteredElements = [...this.elements];
      return;
    }

    const searchText = this.searchText.toLowerCase();
    this.filteredElements = this.elements.filter(element =>
      element.tag.toLowerCase().includes(searchText) ||
      (element.attributes['class'] && element.attributes['class'].toLowerCase().includes(searchText)) ||
      (element.attributes['id'] && element.attributes['id'].toLowerCase().includes(searchText))
    );
  }

  selectElement(element: ElementNode) {
    this.selectedElement = this.selectedElement === element ? null : element;
  }

  refresh() {
    // Here you would implement the logic to refresh the elements tree
    // by analyzing the preview iframe's DOM
  }

  getAttributeEntries(element: ElementNode): [string, string][] {
    return Object.entries(element.attributes);
  }

  getComputedStyles(element: ElementNode) {
    return element.computedStyles;
  }
}
