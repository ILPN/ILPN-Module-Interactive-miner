import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {
    LpoFireValidator,
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
    private _modelSub?: Subscription;
    private _posSub?: Subscription;
    private _pos: Array<PetriNet> = [];
    private _model?: PetriNet;
    private _oldSliderValue = 0;
    private _selected: Set<number>;

    public buttons: Array<ButtonConfig> = [];
    public total = 0;
    public maximum = 0;
    public cumulative = false;
    public fcCumulative: FormControl;
    public fcSlider: FormControl;

    @Input()
    public model$: Observable<PetriNet | undefined> | undefined;

    @Input()
    public pos$: Observable<Array<PetriNet>> | undefined;

    @Output()
    public selectionUpdate: EventEmitter<Array<number>>;

    @Output()
    public sizeChanged: EventEmitter<number>;

    @Output()
    public modelSelected: EventEmitter<number>;

    constructor(private _pnToPoTransformer: PetriNetToPartialOrderTransformerService) {
        this._selected = new Set<number>();
        this.selectionUpdate = new EventEmitter<Array<number>>();
        this.sizeChanged = new EventEmitter<number>();
        this.modelSelected = new EventEmitter<number>();
        this.fcCumulative = new FormControl(this.cumulative);
        this._fcCumulativeSub = this.fcCumulative.valueChanges.subscribe(v => {
            this.cumulative = v;
        });
        this.fcSlider = new FormControl(0);
        this.fcSlider.disable();
        this._fcSliderSub = this.fcSlider.valueChanges.pipe(debounceTime(500)).subscribe(i => {
            if (i > this._oldSliderValue) {
                for (let j = this._oldSliderValue + 1; j <= i; j++) {
                    this.buttons[j].fc.setValue(true);
                    this.buttons[j].state = ButtonState.SELECTED;
                    this._selected.add(j);
                }
            } else {
                for (let j = i + 1; j <= this._oldSliderValue; j++) {
                    this.buttons[j].fc.setValue(false);
                    this.buttons[j].state = ButtonState.DESELECTED;
                    this._selected.delete(j);
                }
            }
            this._oldSliderValue = i;
            this.emitSelectionUpdate();
        });
    }

    ngOnInit(): void {
        if (this.model$ === undefined || this.pos$ === undefined) {
            return;
        }
        this._modelSub = this.model$.subscribe(net => {
            this.processNewModel(net);
        });
        this._posSub = this.pos$.subscribe(pos => {
            this.processNewPOs(pos);
        });
    }

    ngOnDestroy(): void {
        this._fcCumulativeSub.unsubscribe();
        this._fcSliderSub.unsubscribe();
        if (this._modelSub !== undefined) {
            this._modelSub.unsubscribe();
        }
        if (this._posSub !== undefined) {
            this._posSub.unsubscribe();
        }
    }

    private processNewModel(model?: PetriNet) {
        if (model === undefined) {
            this._model = undefined;
            return;
        }
        this._model = model;

        for (let i = 0; i < this._pos.length; i++) {
            const button = this.buttons[i];
            if (button.state == ButtonState.SELECTED) {
                continue;
            }
            if (this.firePO(model, this._pos[i])) {
                button.state = ButtonState.SUGGESTED;
            } else {
                button.state = ButtonState.DESELECTED;
            }
        }
    }

    private processNewPOs(pos: Array<PetriNet>) {
        this._pos = pos;
        this.total = this._pos.reduce((acc, po) => acc + po.frequency!, 0);
        this.maximum = this._pos.reduce((max, po) => max >= po.frequency! ? max : po.frequency!, 0);
        this.generateButtonConfig();
        this._model = undefined;
        this._selected = new Set(this.buttons.length > 0 ? [0] : []);
        this.emitSelectionUpdate();
        this.cancelSelection();
        this.sizeChanged.emit(18 * this.buttons.length + 27);
        this._oldSliderValue = 0;
        this.fcSlider.setValue(0);
        if (this.buttons.length > 0) {
            this.buttons[0].fc.setValue(true);
            this.fcSlider.enable();
        } else {
            this.fcSlider.disable();
        }
    }

    private generateButtonConfig() {
        let runningTotal = 0;
        this.buttons = this._pos.map((po, index) => {
            const c: ButtonConfig = {
                index,
                absolute: po.frequency!,
                cumulated: runningTotal + po.frequency!,
                state: ButtonState.DESELECTED,
                fc: new FormControl(false),
                selected: false,
            };
            runningTotal += po.frequency!;
            return c;
        });
    }

    public processCheckboxChange(index: number, checked: boolean) {
        if (checked) {
            this._selected.add(index);
            this.buttons[index].state = ButtonState.SELECTED;
        } else {
            this._selected.delete(index);
            this.buttons[index].state = ButtonState.DESELECTED;
        }
        this.emitSelectionUpdate();
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

    public modelClicked(index: number) {
        this.buttons[index].selected = !this.buttons[index].selected;
        if (this.buttons[index].selected) {
            for (let i = 0; i < this.buttons.length; i++) {
                if (i === index) {
                    continue;
                }
                this.buttons[i].selected = false;
            }
            this.modelSelected.emit(index);
        } else {
            this.cancelSelection();
        }
    }

    public cancelSelection() {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].selected = false;
        }
        this.modelSelected.emit(-1);
    }

    private emitSelectionUpdate() {
        this.selectionUpdate.emit(Array.from(this._selected).sort((a, b) => a - b));
    }

}
