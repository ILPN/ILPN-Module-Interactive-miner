import {Component, OnDestroy} from '@angular/core';
import {
    AlphaOracleService,
    DropFile,
    FD_LOG,
    FD_PETRI_NET,
    LogCleaner,
    LogToPartialOrderTransformerService,
    PartialOrderNetWithContainedTraces,
    PetriNet,
    PetriNetSerialisationService,
    PrimeMinerService,
    Trace,
    XesLogParserService
} from 'ilpn-components';
import {BehaviorSubject, Subscription} from 'rxjs';
import {SelectionChange, SelectionChangeType} from '../model/selection-change';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent extends LogCleaner implements OnDestroy {

    private _minerSub: Subscription | undefined;
    private _modelSub: Subscription;
    private _selectedIndex = -1;
    private _whitelist = new Set<number>();
    private _blacklist = new Set<number>();
    private _posInModel = new Set<number>();

    fdLog = FD_LOG;
    fdPN = FD_PETRI_NET;

    log: Array<Trace> | undefined;
    pos: Array<PartialOrderNetWithContainedTraces> = [];

    model$: BehaviorSubject<PetriNet>;
    file: DropFile | undefined;

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService,
                private _primeMiner: PrimeMinerService,
                private _serialisationService: PetriNetSerialisationService) {
        super();
        this.model$ = new BehaviorSubject<PetriNet>(new PetriNet());
        this._modelSub = this.model$.subscribe(net => {
            if (net.isEmpty()) {
                this.file = undefined;
            } else {
                this.file = new DropFile('model.pn', this._serialisationService.serialise(net));
            }
        })
    }

    ngOnDestroy(): void {
        if (this._minerSub) {
            this._minerSub.unsubscribe();
        }
        this._modelSub.unsubscribe();
    }

    processUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
        this.log = this.cleanLog(this.log);
        if (this.log !== undefined) {
            const concurrency = this._oracle.determineConcurrency(this.log, {
                lookAheadDistance: 1,
                distinguishSameLabels: false
            });
            this.pos = this._poTransformer.transformToPartialOrders(this.log, concurrency);
            this.pos.sort((a, b) => b.net.frequency! - a.net.frequency!);
        }
    }

    updateSelection(update: SelectionChange) {
        switch (update.type) {
            case SelectionChangeType.RESET:
                this.resetState();
                return;
            case SelectionChangeType.INDEX:
                this._selectedIndex = update.value;
                break;
            case SelectionChangeType.WHITELIST_ADD:
                this._whitelist.add(update.value);
                break;
            case SelectionChangeType.WHITELIST_REMOVE:
                this._whitelist.delete(update.value);
                break;
            case SelectionChangeType.BLACKLIST_ADD:
                this._blacklist.add(update.value);
                break;
            case SelectionChangeType.BLACKLIST_REMOVE:
                this._blacklist.delete(update.value);
                break;
        }
        this.updateModel();
    }

    updateModel() {
        const nets = [];
        const indices = new Set<number>();
        for (let i = 0; i <= this._selectedIndex && i < this.pos.length; i++) {
            if (this._blacklist.has(i)) {
                continue;
            }
            nets.push(this.pos[i]);
            indices.add(i);
        }
        for (const i of this._whitelist) {
            if (indices.has(i)) {
                continue;
            }
            nets.push(this.pos[i]);
            indices.add(i);
        }
        if (nets.length === 0) {
            this.model$.next(new PetriNet());
            return;
        }

        if (indices.size === this._posInModel.size && Array.from(indices).every(i => this._posInModel.has(i))) {
            // the specification has not changed => the current model is still valid;
            this.model$.next(this.model$.value);
            return;
        }

        this._minerSub = this._primeMiner.mine(nets, {
            skipConnectivityCheck: true,
            oneBoundRegions: true
        }).subscribe(r => {
            this._posInModel = indices;
            this.model$.next(r.net);
        });
    }

    private resetState() {
        this._selectedIndex = -1;
        this._whitelist.clear();
        this._blacklist.clear();
        this._posInModel.clear();
    }
}
