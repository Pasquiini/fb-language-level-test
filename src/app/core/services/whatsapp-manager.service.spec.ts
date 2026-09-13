import { TestBed } from '@angular/core/testing';

import { WhatsappManagerService } from './whatsapp-manager.service';

describe('WhatsappManagerService', () => {
  let service: WhatsappManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsappManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
