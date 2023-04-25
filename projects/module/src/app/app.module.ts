import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app.component';
import {
    IlpnAlgorithmsModule,
    IlpnComponentsModule,
    PetriNetLayoutManagerFactoryService,
    SpringEmbedderLayoutManagerFactoryService
} from 'ilpn-components';
import {FlexLayoutModule} from '@angular/flex-layout';
import {ReactiveFormsModule} from '@angular/forms';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {APP_BASE_HREF, PlatformLocation} from '@angular/common';
import {CumulativeSliderComponent} from './cumulative-slider/cumulative-slider.component';
import {MatSliderModule} from '@angular/material/slider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatRadioModule} from '@angular/material/radio';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {GraphBarComponent} from './cumulative-slider/graph-bar/graph-bar.component';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {SliderGridRowPipe} from './cumulative-slider/pipes/slider-grid-row.pipe';
import {GraphBarRowPipe} from './cumulative-slider/pipes/graph-bar-row.pipe';

@NgModule({
    declarations: [
        AppComponent,
        CumulativeSliderComponent,
        GraphBarComponent,
        SliderGridRowPipe,
        GraphBarRowPipe
    ],
    imports: [
        BrowserModule,
        IlpnComponentsModule,
        IlpnAlgorithmsModule.withDebugConfig({
            logRegions: true
        }),
        FlexLayoutModule,
        ReactiveFormsModule,
        MatSlideToggleModule,
        BrowserAnimationsModule,
        MatSliderModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatCheckboxModule,
        MatButtonToggleModule,
        MatProgressSpinnerModule,
    ],
    providers: [
        {
            provide: APP_BASE_HREF,
            useFactory: (s: PlatformLocation) => s.getBaseHrefFromDOM(),
            deps: [PlatformLocation]
        },
        {
            provide: PetriNetLayoutManagerFactoryService,
            useExisting: SpringEmbedderLayoutManagerFactoryService,
        }
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
