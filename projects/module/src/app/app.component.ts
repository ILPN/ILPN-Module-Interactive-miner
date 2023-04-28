import {Component, OnDestroy} from '@angular/core';
import {
    AlphaOracleService,
    cleanLog,
    ConcurrencyRelation,
    DropFile,
    FD_LOG,
    FD_PETRI_NET,
    IncrementalMiner,
    IncrementalMinerFactoryService,
    LogToPartialOrderTransformerService,
    PetriNet,
    PetriNetRegionSynthesisService,
    PetriNetSerialisationService,
    RegionsConfiguration,
    Trace,
    XesLogParserService
} from 'ilpn-components';
import {BehaviorSubject, combineLatest, map, Subscription} from 'rxjs';
import {FormControl} from '@angular/forms';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {

    private readonly _incrementalMinerNoWeights: IncrementalMiner;
    private readonly _incrementalMinerWeights: IncrementalMiner;
    private readonly _subs: Array<Subscription> = [];
    private _minerSub: Subscription | undefined;
    private _displayedIndex = -1;
    private _selectedIndices?: Array<number>;
    private _log$: BehaviorSubject<Array<Trace>>;

    firstLogUploaded = false;

    fdLog = FD_LOG;
    fdPN = FD_PETRI_NET;

    displayedModel$: BehaviorSubject<PetriNet>;
    model$: BehaviorSubject<PetriNet>;
    pos$: BehaviorSubject<Array<PetriNet>>;
    file: DropFile | undefined;

    svgHeight = '800px';

    fcConvertToPOs: FormControl;
    fcIncremental: FormControl;
    fcArcWeights: FormControl;

    loading$: BehaviorSubject<boolean>;

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService,
                private _serialisationService: PetriNetSerialisationService,
                private _regionMiner: PetriNetRegionSynthesisService,
                minerFactory: IncrementalMinerFactoryService) {
        this.fcConvertToPOs = new FormControl(true);
        this.fcIncremental = new FormControl(true);
        this.fcArcWeights = new FormControl(false);
        this.model$ = new BehaviorSubject<PetriNet>(new PetriNet());
        this.displayedModel$ = new BehaviorSubject<PetriNet>(new PetriNet());
        this._subs.push(this.model$.subscribe(net => {
            if (net.isEmpty()) {
                this.file = undefined;
            } else {
                this.file = new DropFile('model.pn', this._serialisationService.serialise(net));
            }
        }));
        this._log$ = new BehaviorSubject<Array<Trace>>([]);
        this.pos$ = new BehaviorSubject<Array<PetriNet>>([]);
        this.loading$ = new BehaviorSubject<boolean>(false);

        // separate caches!
        this._incrementalMinerNoWeights = minerFactory.create(this.pos$.asObservable());
        this._incrementalMinerWeights = minerFactory.create(this.pos$.asObservable());

        this._subs.push(this.fcIncremental.valueChanges.subscribe(() => {
            this.mineModel();
        }));
        this._subs.push(this.fcArcWeights.valueChanges.subscribe(() => {
            this.mineModel();
        }));
        this._subs.push(combineLatest([this._log$.asObservable(), this.fcConvertToPOs.valueChanges]).subscribe( ([log, convertToPos]) => {
            this.processLog(log, convertToPos);
        }));
        // valueChanges must emit at least once, so that combineLatest works
        this.fcConvertToPOs.setValue(this.fcConvertToPOs.value);
    }

    ngOnDestroy(): void {
        if (this._minerSub) {
            this._minerSub.unsubscribe();
        }
        for (const sub of this._subs) {
            sub.unsubscribe();
        }

        this.model$.complete();
        this.displayedModel$.complete();
        this._log$.complete();
        this.pos$.complete();
        this.loading$.complete();
    }

    processUpload(files: Array<DropFile>) {
        this.loading$.next(true);

        let log = this._logParser.parse(files[0].content);
        log = cleanLog(log);
        if (log !== undefined) {
            this._log$.next(log);
        } else {
            this._log$.next([]);
        }
        this.loading$.next(false);
    }

    updateModel(selectedIndices: Array<number>) {
        if (selectedIndices.length === 0) {
            this.emitNext(new PetriNet());
            return;
        }

        this._selectedIndices = selectedIndices;
        this.mineModel();
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

    clearMinerCache() {
        this._incrementalMinerWeights.clearCache();
        this._incrementalMinerNoWeights.clearCache();
    }

    private processLog(log: Array<Trace>, convertToPOs: boolean) {
        let concurrency: ConcurrencyRelation;
        if (convertToPOs) {
            concurrency = this._oracle.determineConcurrency(log, {
                lookAheadDistance: 1,
                distinguishSameLabels: false
            });
        } else {
            concurrency = ConcurrencyRelation.noConcurrency();
        }

        const pos = this._poTransformer.transformToPartialOrders(log, concurrency, {discardPrefixes: true}).map(po => po.net);
        pos.sort((a, b) => b.frequency! - a.frequency!);
        this.pos$.next(pos);
        if (pos.length > 0) {
            this.firstLogUploaded = true;
        }
    }

    private mineModel() {
        if (this._selectedIndices === undefined || this._selectedIndices.length === 0) {
            console.debug('No spec indices selected');
            return;
        }

        const config: RegionsConfiguration = {
            noArcWeights: !this.fcArcWeights.value
        };

        this.loading$.next(true);
        if (this.fcIncremental.value) {
            const miner = this.fcArcWeights.value ? this._incrementalMinerWeights : this._incrementalMinerNoWeights;
            this._minerSub = miner.mine(this._selectedIndices, config).subscribe(net => {
                this.emitNext(net);
                this.loading$.next(false);
            });
        } else {
            const pos = [];

            for (const i of this._selectedIndices) {
                pos.push(this.pos$.value[i]);
            }

            this._minerSub = this._regionMiner.synthesise(pos, config)
                .pipe(
                    map(sr => sr.result)
                )
                .subscribe(net => {
                    this.emitNext(net);
                    this.loading$.next(false);
                });
        }
    }
}
