import {Component, OnDestroy} from '@angular/core';
import {
    AlphaOracleService,
    cleanLog,
    DropFile,
    FD_LOG,
    FD_PETRI_NET,
    IncrementalMiner,
    IncrementalMinerFactoryService,
    LogToPartialOrderTransformerService,
    PetriNet,
    PetriNetSerialisationService,
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

    private _miner: IncrementalMiner;
    private _minerSub: Subscription | undefined;
    private _modelSub: Subscription;
    private _displayedIndex = -1;

    fdLog = FD_LOG;
    fdPN = FD_PETRI_NET;

    log: Array<Trace> | undefined;

    displayedModel$: BehaviorSubject<PetriNet>;
    model$: BehaviorSubject<PetriNet>;
    pos$: BehaviorSubject<Array<PetriNet>>;
    file: DropFile | undefined;

    svgHeight = '800px';

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService,
                private _serialisationService: PetriNetSerialisationService,
                minerFactory: IncrementalMinerFactoryService) {
        this.model$ = new BehaviorSubject<PetriNet>(new PetriNet());
        this.displayedModel$ = new BehaviorSubject<PetriNet>(new PetriNet());
        this._modelSub = this.model$.subscribe(net => {
            if (net.isEmpty()) {
                this.file = undefined;
            } else {
                this.file = new DropFile('model.pn', this._serialisationService.serialise(net));
            }
        })
        this.pos$ = new BehaviorSubject<Array<PetriNet>>([]);
        this._miner = minerFactory.create(this.pos$.asObservable());
    }

    ngOnDestroy(): void {
        if (this._minerSub) {
            this._minerSub.unsubscribe();
        }
        this._modelSub.unsubscribe();
        this.model$.complete();
        this.displayedModel$.complete();
        this.pos$.complete();
    }

    processUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
        this.log = cleanLog(this.log);
        if (this.log !== undefined) {
            const concurrency = this._oracle.determineConcurrency(this.log, {
                lookAheadDistance: 1,
                distinguishSameLabels: false
            });
            const pos = this._poTransformer.transformToPartialOrders(this.log, concurrency, {discardPrefixes: true}).map(po => po.net);
            pos.sort((a, b) => b.frequency! - a.frequency!);
            this.pos$.next(pos);
        }
    }

    updateModel(selectedIndices: Set<number>) {
        if (selectedIndices.size === 0) {
            this.emitNext(new PetriNet());
            return;
        }

        this._minerSub = this._miner.mine(selectedIndices, {
            oneBoundRegions: true
        }).subscribe(net => {
            this.emitNext(net);
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
            this.displayedModel$.next(this.pos$.value[this._displayedIndex]);
        }
    }
}
