import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { testAttemptGuard } from './test-attempt.guard';

describe('testAttemptGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => testAttemptGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
