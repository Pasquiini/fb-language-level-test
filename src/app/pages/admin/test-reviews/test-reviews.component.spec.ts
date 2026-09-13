import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestReviewsComponent } from './test-reviews.component';

describe('TestReviewsComponent', () => {
  let component: TestReviewsComponent;
  let fixture: ComponentFixture<TestReviewsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestReviewsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestReviewsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
