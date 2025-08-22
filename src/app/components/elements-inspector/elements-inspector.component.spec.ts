import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElementsInspectorComponent } from './elements-inspector.component';

describe('ElementsInspectorComponent', () => {
  let component: ElementsInspectorComponent;
  let fixture: ComponentFixture<ElementsInspectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ElementsInspectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElementsInspectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
