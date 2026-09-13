import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunicationQueueComponent } from './communication-queue.component';

describe('CommunicationQueueComponent', () => {
  let component: CommunicationQueueComponent;
  let fixture: ComponentFixture<CommunicationQueueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunicationQueueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CommunicationQueueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
