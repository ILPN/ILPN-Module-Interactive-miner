import {FormControl} from '@angular/forms';
import {ButtonState} from './button-state';

export interface ButtonConfig {
    index: number;
    absolute: number;
    cumulated: number;
    state: ButtonState;
    fc: FormControl;
}
