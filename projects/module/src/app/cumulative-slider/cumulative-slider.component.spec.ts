import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CumulativeSliderComponent} from './cumulative-slider.component';

describe('CumulativeSliderComponent', () => {
    let component: CumulativeSliderComponent;
    let fixture: ComponentFixture<CumulativeSliderComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CumulativeSliderComponent]
        })
            .compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CumulativeSliderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
