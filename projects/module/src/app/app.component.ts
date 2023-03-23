import {Component, OnDestroy} from '@angular/core';
import {
    AlphaOracleService,
    cleanLog,
    DropFile,
    FD_LOG,
    FD_PETRI_NET,
    LogToPartialOrderTransformerService,
    PartialOrderNetWithContainedTraces,
    PetriNet,
    PetriNetSerialisationService,
    PrimeMinerService,
    Trace,
    XesLogParserService
} from 'ilpn-components';
import {BehaviorSubject, Subscription} from 'rxjs';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {

    private _minerSub: Subscription | undefined;
    private _modelSub: Subscription;
    private _posInModel = new Set<number>();
    private _displayedIndex = -1;

    fdLog = FD_LOG;
    fdPN = FD_PETRI_NET;

    log: Array<Trace> | undefined;
    pos: Array<PartialOrderNetWithContainedTraces> = [];

    displayedModel$: BehaviorSubject<PetriNet>;
    model$: BehaviorSubject<PetriNet>;
    file: DropFile | undefined;

    svgHeight = '800px';

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService,
                private _primeMiner: PrimeMinerService,
                private _serialisationService: PetriNetSerialisationService) {
        this.model$ = new BehaviorSubject<PetriNet>(new PetriNet());
        this.displayedModel$ = new BehaviorSubject<PetriNet>(new PetriNet());
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
        this.model$.complete();
        this.displayedModel$.complete();
    }

    processUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
        this.log = cleanLog(this.log);
        if (this.log !== undefined) {
            const concurrency = this._oracle.determineConcurrency(this.log, {
                lookAheadDistance: 1,
                distinguishSameLabels: false
            });
            this.pos = this._poTransformer.transformToPartialOrders(this.log, concurrency, {discardPrefixes: true});
            this.pos.sort((a, b) => b.net.frequency! - a.net.frequency!);
        }
    }

    updateModel(selectedIndices: Set<number>) {
        const nets = [];
        for (const i of Array.from(selectedIndices).sort()) {
            nets.push(this.pos[i]);
        }
        if (nets.length === 0) {
            this._posInModel.clear();
            this.emitNext(new PetriNet());
            return;
        }

        if (selectedIndices.size === this._posInModel.size && Array.from(selectedIndices).every(i => this._posInModel.has(i))) {
            // the specification has not changed => the current model is still valid;
            this.emitNext(this.model$.value);
            return;
        }

        this._minerSub = this._primeMiner.mine(nets, {
            skipConnectivityCheck: true,
            oneBoundRegions: true
        }).subscribe(r => {
            this._posInModel = selectedIndices;
            this.emitNext(r.net);
        });
    }

    svgSizeChange(newHeight: number) {
        if (newHeight < 800) {
            this.svgHeight = '800px';
        } else {
            this.svgHeight = `${newHeight}px`;
        }
    }

    private emitNext(model: PetriNet) {
        this.model$.next(model);
        if (this._displayedIndex === -1) {
            this.displayedModel$.next(model);
        }
    }

    changeModelDisplay(index: number) {
        this._displayedIndex = index;
        if (this._displayedIndex === -1) {
            this.displayedModel$.next(this.model$.value);
        } else {
            this.displayedModel$.next(this.pos[this._displayedIndex].net);
        }
    }
}
