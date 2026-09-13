import { TestBed } from '@angular/core/testing';

import { AdminTestReviewService } from './admin-test-review.service';

describe('AdminTestReviewService', () => {
  let service: AdminTestReviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminTestReviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
