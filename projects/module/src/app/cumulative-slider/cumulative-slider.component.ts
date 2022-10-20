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
}

interface ButtonConfig {
    index: number;
    absolute: number;
    cumulated: number;
    state: ButtonState;
}

@Component({
    selector: 'app-cumulative-slider',
    templateUrl: './cumulative-slider.component.html',
    styleUrls: ['./cumulative-slider.component.scss']
})
export class CumulativeSliderComponent implements OnInit, OnDestroy {

    private _modelSub: Subscription | undefined;
    private _pos: Array<PartialOrderNetWithContainedTraces> = [];
    private _model: PetriNet | undefined;

    public buttons: Array<ButtonConfig> = [];
    public total = 0;

    @Input()
    public model$: Observable<PetriNet | undefined> | undefined;

    @Output()
    public selectionUpdate: EventEmitter<SelectionChange>;

    constructor(private _pnToPoTransformer: PetriNetToPartialOrderTransformerService) {
        this.selectionUpdate = new EventEmitter<SelectionChange>();
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
        if (this._modelSub !== undefined) {
            this._modelSub.unsubscribe();
        }
    }

    @Input()
    set pos(pos: Array<PartialOrderNetWithContainedTraces>) {
        this._pos = pos;
        this.total = this._pos.reduce((acc, po) => acc + po.net.frequency!, 0);
        this.generateButtonConfig();
        this._model = undefined;
        this.selectionUpdate.emit(new SelectionChange(SelectionChangeType.RESET, -1));
    }

    private generateButtonConfig() {
        let runningTotal = 0;
        this.buttons = this._pos.map((po, index) => {
            const c: ButtonConfig = {
                index,
                absolute: po.net.frequency!,
                cumulated: runningTotal + po.net.frequency!,
                state: ButtonState.DESELECTED,
            };
            runningTotal += po.net.frequency!;
            return c;
        });
    }

    public processCheckboxChange(index: number, event: Event) {
        const added = (event.target as HTMLInputElement).checked;
        this.buttons[index].state = added ? ButtonState.SELECTED : ButtonState.DESELECTED;
        this.selectionUpdate.emit(new SelectionChange( added ? SelectionChangeType.ADD : SelectionChangeType.REMOVE, index));
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
