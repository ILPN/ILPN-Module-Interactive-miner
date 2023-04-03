import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'graphBarRow'
})
export class GraphBarRowPipe implements PipeTransform {

    transform(i: number): string {
        return `${i * 2 + 1} / ${(i+1) * 2 + 1}`;
    }

}
