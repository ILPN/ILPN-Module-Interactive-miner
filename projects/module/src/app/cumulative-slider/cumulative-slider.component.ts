import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {
    LpoFireValidator,
    PartialOrderNetWithContainedTraces,
    PetriNet,
    PetriNetToPartialOrderTransformerService
} from 'ilpn-components';
import {FormControl} from '@angular/forms';
import {debounceTime, Observable, Subscription} from 'rxjs';
import {SelectionChange, SelectionChangeType} from '../../model/selection-change';


enum ButtonState {
    DESELECTED,
    SELECTED,
    SUGGESTED,
    FORCE_INCLUDED,
    FORCE_EXCLUDED
}

interface ButtonConfig {
    index: number;
    cumulated: number;
    state: ButtonState;
    selected: boolean;
}

@Component({
    selector: 'app-cumulative-slider',
    templateUrl: './cumulative-slider.component.html',
    styleUrls: ['./cumulative-slider.component.scss']
})
export class CumulativeSliderComponent implements OnInit, OnDestroy {

    private _fcSub: Subscription;
    private _changeSub: Subscription;
    private _radioSub: Subscription;
    private _modelSub: Subscription | undefined;
    private _pos: Array<PartialOrderNetWithContainedTraces> = [];
    private _model: PetriNet | undefined;

    public selectedButton: ButtonConfig | undefined;

    public buttons: Array<ButtonConfig> = [];
    public total = 0;
    public sliderFc: FormControl;
    public radioFc: FormControl;

    @Input()
    public model$: Observable<PetriNet | undefined> | undefined;

    @Output()
    public selectionUpdate: EventEmitter<SelectionChange>;

    constructor(private _pnToPoTransformer: PetriNetToPartialOrderTransformerService) {
        this.sliderFc = new FormControl(0);
        this._fcSub = this.sliderFc.valueChanges.subscribe(() => this.processSliderChange());
        this.radioFc = new FormControl('n/a');
        this.radioFc.disable();
        this._radioSub = this.radioFc.valueChanges.subscribe(v => this.processRadioChange(v));
        this.selectionUpdate = new EventEmitter<SelectionChange>();
        this._changeSub = this.sliderFc.valueChanges.pipe(
            debounceTime(300)
        ).subscribe(i =>
            this.selectionUpdate.emit(new SelectionChange(SelectionChangeType.INDEX, i))
        );
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

            for (let i = this.sliderFc.value + 1; i < this._pos.length; i++) {
                const button = this.buttons[i];
                if (button.state === ButtonState.FORCE_EXCLUDED || button.state === ButtonState.FORCE_INCLUDED) {
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
        this._fcSub.unsubscribe();
        this._changeSub.unsubscribe();
        this._radioSub.unsubscribe();
    }

    @Input()
    set pos(pos: Array<PartialOrderNetWithContainedTraces>) {
        this.selectedButton = undefined;
        this.radioFc.setValue('n/a', {emitEvent: false});
        this.radioFc.disable({emitEvent: false});
        this._pos = pos;
        this.total = this._pos.reduce((acc, po) => acc + po.net.frequency!, 0);
        this.generateButtonConfig();
        this._model = undefined;
        this.sliderFc.setValue(0);
        this.selectionUpdate.emit(new SelectionChange(SelectionChangeType.RESET, -1));
    }

    private generateButtonConfig() {
        let runningTotal = 0;
        this.buttons = this._pos.map((po, index) => {
            const c = {
                index,
                cumulated: runningTotal + po.net.frequency!,
                state: ButtonState.DESELECTED,
                selected: false,
            };
            runningTotal += po.net.frequency!;
            return c;
        });
    }

    private processSliderChange() {
        for (let i = 0; i < this.buttons.length; i++) {
            const button = this.buttons[i];
            if (button.state !== ButtonState.FORCE_EXCLUDED && button.state !== ButtonState.FORCE_INCLUDED) {
                button.state = i <= this.sliderFc.value ? ButtonState.SELECTED : ButtonState.DESELECTED;
            }
        }
    }

    private processRadioChange(value: string) {
        if (this.selectedButton === undefined) {
            return;
        }
        switch (value) {
            case 'include':
                this.selectedButton.state = ButtonState.FORCE_INCLUDED;
                this.selectionUpdate.emit(new SelectionChange(SelectionChangeType.WHITELIST_ADD, this.selectedButton.index));
                return;
            case 'exclude':
                this.selectedButton.state = ButtonState.FORCE_EXCLUDED;
                this.selectionUpdate.emit(new SelectionChange(SelectionChangeType.BLACKLIST_ADD, this.selectedButton.index));
                return;
            case 'n/a':
                const oldState = this.selectedButton.state;
                if (this.selectedButton.index <= this.sliderFc.value) {
                    this.selectedButton.state = ButtonState.SELECTED;
                } else if (this.firePO(this._model, this._pos[this.selectedButton.index].net)) {
                    this.selectedButton.state = ButtonState.SUGGESTED;
                } else {
                    this.selectedButton.state = ButtonState.DESELECTED;
                }
                this.selectionUpdate.emit(new SelectionChange(oldState === ButtonState.FORCE_INCLUDED ? SelectionChangeType.WHITELIST_REMOVE : SelectionChangeType.BLACKLIST_REMOVE, this.selectedButton.index));
                return;
        }
    }

    public buttonPressed(index: number) {
        if (this.selectedButton !== undefined) {
            this.selectedButton.selected = false;
        }
        this.selectedButton = this.buttons[index];
        this.selectedButton.selected = true;
        this.radioFc.enable({emitEvent: false});
        switch (this.selectedButton.state) {
            case ButtonState.FORCE_INCLUDED:
                this.radioFc.setValue('include', {emitEvent: false});
                break;
            case ButtonState.FORCE_EXCLUDED:
                this.radioFc.setValue('exclude', {emitEvent: false});
                break;
            default:
                this.radioFc.setValue('n/a', {emitEvent: false});
                break;
        }
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
