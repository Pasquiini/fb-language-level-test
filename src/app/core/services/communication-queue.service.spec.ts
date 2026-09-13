import { TestBed } from '@angular/core/testing';

import { CommunicationQueueService } from './communication-queue.service';

describe('CommunicationQueueService', () => {
  let service: CommunicationQueueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommunicationQueueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
