import {Pipe, PipeTransform} from '@angular/core';
import {ButtonConfig} from '../model/button-config';

@Pipe({
    name: 'sliderGridRow'
})
export class SliderGridRowPipe implements PipeTransform {

    transform(value: Array<ButtonConfig>): string {
        if (value.length === 0) {
            return '1 / 2';
        }

        return `2 / ${value.length * 2}`;
    }

}
