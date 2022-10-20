import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {
    LpoFireValidator,
    PartialOrderNetWithContainedTraces,
    PetriNet,
    PetriNetToPartialOrderTransformerService
} from 'ilpn-components';
import {debounceTime, Observable, Subscription} from 'rxjs';
import {FormControl} from '@angular/forms';
import {ButtonConfig} from './model/button-config';
import {ButtonState} from './model/button-state';


@Component({
    selector: 'app-cumulative-slider',
    templateUrl: './cumulative-slider.component.html',
    styleUrls: ['./cumulative-slider.component.scss']
})
export class CumulativeSliderComponent implements OnInit, OnDestroy {

    private _fcCumulativeSub: Subscription;
    private _fcSliderSub: Subscription;
    private _modelSub: Subscription | undefined;
    private _pos: Array<PartialOrderNetWithContainedTraces> = [];
    private _model: PetriNet | undefined;
    private _oldSliderValue = 0;
    private _selected: Set<number>;

    public buttons: Array<ButtonConfig> = [];
    public total = 0;
    public maximum = 0;
    public cumulative = true;
    public fcCumulative: FormControl;
    public fcSlider: FormControl;

    @Input()
    public model$: Observable<PetriNet | undefined> | undefined;

    @Output()
    public selectionUpdate: EventEmitter<Set<number>>;

    @Output()
    public sizeChanged: EventEmitter<number>;

    constructor(private _pnToPoTransformer: PetriNetToPartialOrderTransformerService) {
        this._selected = new Set<number>();
        this.selectionUpdate = new EventEmitter<Set<number>>();
        this.sizeChanged = new EventEmitter<number>();
        this.fcCumulative = new FormControl(this.cumulative);
        this._fcCumulativeSub = this.fcCumulative.valueChanges.subscribe(v => {
            this.cumulative = v;
        });
        this.fcSlider = new FormControl(0);
        this._fcSliderSub = this.fcSlider.valueChanges.pipe(debounceTime(500)).subscribe(i => {
            if (i > this._oldSliderValue) {
                for (let j = this._oldSliderValue + 1; j <= i; j++) {
                    this.buttons[j].fc.setValue(true);
                    this._selected.add(j);
                }
            } else {
                for (let j = i + 1; j <= this._oldSliderValue; j++) {
                    this.buttons[j].fc.setValue(false);
                    this._selected.delete(j);
                }
            }
            this._oldSliderValue = i;
            this.selectionUpdate.emit(new Set(this._selected));
        });
    }

    ngOnInit(): void {
        if (this.model$ === undefined) {
            return;
        }
        this._modelSub = this.model$.subscribe(net => {
            if (net === undefined) {
                this._model = undefined;
                return;
            }
            this._model = net;

            for (let i = 0; i < this._pos.length; i++) {
                const button = this.buttons[i];
                if (button.state == ButtonState.SELECTED) {
                    continue;
                }
                if (this.firePO(net, this._pos[i].net)) {
                    button.state = ButtonState.SUGGESTED;
                } else {
                    button.state = ButtonState.DESELECTED;
                }
            }
        });
    }

    ngOnDestroy(): void {
        this._fcCumulativeSub.unsubscribe();
        this._fcSliderSub.unsubscribe();
        if (this._modelSub !== undefined) {
            this._modelSub.unsubscribe();
        }
    }

    @Input()
    set pos(pos: Array<PartialOrderNetWithContainedTraces>) {
        this._pos = pos;
        this.total = this._pos.reduce((acc, po) => acc + po.net.frequency!, 0);
        this.maximum = this._pos.reduce((max, po) => max >= po.net.frequency! ? max : po.net.frequency!, 0);
        this.generateButtonConfig();
        this._model = undefined;
        this._selected = new Set(this.buttons.length > 0 ? [0] : []);
        this.selectionUpdate.emit(new Set(this._selected));
        this.sizeChanged.emit(20 * this.buttons.length + 27);
        this._oldSliderValue = 0;
        this.fcSlider.setValue(0);
        if (this.buttons.length > 0) {
            this.buttons[0].fc.setValue(true);
        }
    }

    private generateButtonConfig() {
        let runningTotal = 0;
        this.buttons = this._pos.map((po, index) => {
            const c: ButtonConfig = {
                index,
                absolute: po.net.frequency!,
                cumulated: runningTotal + po.net.frequency!,
                state: ButtonState.DESELECTED,
                fc: new FormControl(false)
            };
            runningTotal += po.net.frequency!;
            return c;
        });
    }

    public processCheckboxChange(index: number, checked: boolean) {
        if (checked) {
            this._selected.add(index);
        } else {
            this._selected.delete(index);
        }
        this.selectionUpdate.emit(new Set(this._selected));
    }

    private firePO(net: PetriNet | undefined, po: PetriNet): boolean {
        if (net === undefined) {
            return false;
        }
        try {
            const validator = new LpoFireValidator(net, this._pnToPoTransformer.transform(po));
            return validator.validate().every(r => r.valid);
        } catch (e) {
            return false;
        }
    }
}
