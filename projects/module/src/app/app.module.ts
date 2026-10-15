import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {AppComponent} from './app.component';
import {
    IlpnAlgorithmsModule,
    IlpnComponentsModule,
    PetriNetLayoutManagerFactoryService,
    PnDisplayModule,
    SpringEmbedderLayoutManagerFactoryService
} from 'ilpn-components';
import {FlexLayoutModule} from '@angular/flex-layout';
import {ReactiveFormsModule} from '@angular/forms';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {APP_BASE_HREF, CommonModule, PlatformLocation} from '@angular/common';
import {CumulativeSliderComponent} from './cumulative-slider/cumulative-slider.component';
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatRadioModule} from "@angular/material/radio";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {GraphBarComponent} from './cumulative-slider/graph-bar/graph-bar.component';
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {SliderGridRowPipe} from './cumulative-slider/pipes/slider-grid-row.pipe';
import {GraphBarRowPipe} from './cumulative-slider/pipes/graph-bar-row.pipe';
import {AppRoutingModule} from "./app-routing.module";
import {MatIconModule} from "@angular/material/icon";
import {MatButtonModule} from "@angular/material/button";
import {NgxSliderModule} from '@angular-slider/ngx-slider';

@NgModule({
    declarations: [
        AppComponent,
        CumulativeSliderComponent,
        GraphBarComponent,
        SliderGridRowPipe,
        GraphBarRowPipe
    ],
    imports: [
        AppRoutingModule,
        BrowserModule,
        IlpnComponentsModule,
        PnDisplayModule,
        IlpnAlgorithmsModule.withDebugConfig({
            logRegions: true
        }),
        FlexLayoutModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        MatFormFieldModule,
        MatInputModule,
        MatRadioModule,
        MatCheckboxModule,
        MatButtonToggleModule,
        MatProgressSpinnerModule,
        MatIconModule,
        MatButtonModule,
        NgxSliderModule,
        CommonModule,
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
