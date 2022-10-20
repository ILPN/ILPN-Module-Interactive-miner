export enum SelectionChangeType {
    ADD,
    REMOVE,
    RESET
}

export class SelectionChange {

    constructor(public type: SelectionChangeType, public value: number) {
    }
}
