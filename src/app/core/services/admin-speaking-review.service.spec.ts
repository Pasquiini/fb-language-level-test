import { TestBed } from '@angular/core/testing';

import { AdminSpeakingReviewService } from './admin-speaking-review.service';

describe('AdminSpeakingReviewService', () => {
  let service: AdminSpeakingReviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminSpeakingReviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
