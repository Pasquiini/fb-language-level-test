import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestReviewDetailComponent } from './test-review-detail.component';

describe('TestReviewDetailComponent', () => {
  let component: TestReviewDetailComponent;
  let fixture: ComponentFixture<TestReviewDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestReviewDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestReviewDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
