import {Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {PartialOrderNetWithContainedTraces} from 'ilpn-components';
import {FormControl} from '@angular/forms';
import {debounceTime, Subscription} from 'rxjs';

enum ButtonState {
    DESELECTED,
    SELECTED,
    SUGGESTED
}

interface ButtonConfig {
    cumulated: number;
    state: ButtonState
}

@Component({
    selector: 'app-cumulative-slider',
    templateUrl: './cumulative-slider.component.html',
    styleUrls: ['./cumulative-slider.component.scss']
})
export class CumulativeSliderComponent implements OnDestroy {

    private _fcSub: Subscription;
    private _changeSub: Subscription;
    private _pos: Array<PartialOrderNetWithContainedTraces> = [];

    public buttons: Array<ButtonConfig> = [];
    public total = 0;
    public fc: FormControl;

    @Output()
    public selectedIndices: EventEmitter<number>;

    constructor() {
        this.fc = new FormControl(0);
        this._fcSub = this.fc.valueChanges.subscribe(() => this.processSliderChange());
        this.selectedIndices = new EventEmitter<number>();
        this._changeSub = this.fc.valueChanges.pipe(debounceTime(300)).subscribe(i => this.selectedIndices.emit(i));
    }

    ngOnDestroy(): void {
        this._fcSub.unsubscribe();
        this._changeSub.unsubscribe();
    }

    @Input()
    set pos(pos: Array<PartialOrderNetWithContainedTraces>) {
        this._pos = pos;
        this.total = this._pos.reduce((acc, po) => acc + po.net.frequency!, 0);
        this.generateButtonConfig();
        this.fc.setValue(0);
    }

    private generateButtonConfig() {
        let runningTotal = 0;
        this.buttons = this._pos.map(po => {
            const c = {
                cumulated: runningTotal + po.net.frequency!,
                state: ButtonState.DESELECTED,
            };
            runningTotal += po.net.frequency!;
            return c;
        });
    }

    private processSliderChange() {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].state = i <= this.fc.value ? ButtonState.SELECTED : ButtonState.DESELECTED;
        }
    }
}