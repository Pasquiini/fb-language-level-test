import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhatsappManagerComponent } from './whatsapp-manager.component';

describe('WhatsappManagerComponent', () => {
  let component: WhatsappManagerComponent;
  let fixture: ComponentFixture<WhatsappManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsappManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhatsappManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
