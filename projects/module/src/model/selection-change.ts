export enum SelectionChangeType {
    INDEX,
    WHITELIST_ADD,
    WHITELIST_REMOVE,
    BLACKLIST_ADD,
    BLACKLIST_REMOVE,
    RESET
}

export class SelectionChange {

    constructor(public type: SelectionChangeType, public value: number) {
    }
}
