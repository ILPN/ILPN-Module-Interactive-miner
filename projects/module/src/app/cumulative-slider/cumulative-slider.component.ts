import {Component, Input} from '@angular/core';
import {PartialOrderNetWithContainedTraces} from 'ilpn-components';


interface ButtonConfig {
    cumulated: number;
}

@Component({
    selector: 'app-cumulative-slider',
    templateUrl: './cumulative-slider.component.html',
    styleUrls: ['./cumulative-slider.component.scss']
})
export class CumulativeSliderComponent {

    private _pos: Array<PartialOrderNetWithContainedTraces> = [];

    public buttons: Array<ButtonConfig> = [];
    public total = 0;

    constructor() {
    }

    @Input()
    set pos(pos: Array<PartialOrderNetWithContainedTraces>) {
        this._pos = pos;
        this.total = this._pos.reduce((acc, po) => acc + po.net.frequency!, 0);
        this.generateButtonConfig();
    }

    private generateButtonConfig() {
        let runningTotal = 0;
        this.buttons = this._pos.map(po => {
            const c = {
                cumulated: runningTotal + po.net.frequency!
            };
            runningTotal += po.net.frequency!;
            return c;
        });
    }
}
