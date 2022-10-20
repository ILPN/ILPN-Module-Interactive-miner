import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ButtonConfig} from '../model/button-config';


@Component({
    selector: 'app-graph-bar',
    templateUrl: './graph-bar.component.html',
    styleUrls: ['./graph-bar.component.scss']
})
export class GraphBarComponent {

    // @ts-ignore
    @Input() config: ButtonConfig;
    @Input() cumulative: boolean = true;
    @Input() total: number = 0;
    @Input() maximum: number = 0;

    @Output() selected: EventEmitter<boolean>;

    constructor() {
        this.selected = new EventEmitter<boolean>();
    }

    emitValue(event: Event) {
        const checkbox = event.target as HTMLInputElement;
        if (checkbox === undefined) {
            return;
        }
        this.selected.emit(checkbox.checked);
    }

}
