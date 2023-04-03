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
    PetriNetRegionSynthesisService,
    PetriNetSerialisationService,
    RegionsConfiguration,
    Trace,
    XesLogParserService
} from 'ilpn-components';
import {BehaviorSubject, map, Subscription} from 'rxjs';
import {FormControl} from '@angular/forms';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {

    private readonly _incrementalMinerNoWeights: IncrementalMiner;
    private readonly _incrementalMinerWeights: IncrementalMiner;
    private _minerSub: Subscription | undefined;
    private _modelSub: Subscription;
    private _displayedIndex = -1;
    private _selectedIndices?: Set<number>;
    private _fcIncrementalSub: Subscription;
    private _fcWeightsSub: Subscription;

    fdLog = FD_LOG;
    fdPN = FD_PETRI_NET;

    log: Array<Trace> | undefined;

    displayedModel$: BehaviorSubject<PetriNet>;
    model$: BehaviorSubject<PetriNet>;
    pos$: BehaviorSubject<Array<PetriNet>>;
    file: DropFile | undefined;

    svgHeight = '800px';

    fcIncremental: FormControl;
    fcArcWeights: FormControl;

    loading$: BehaviorSubject<boolean>;

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService,
                private _serialisationService: PetriNetSerialisationService,
                private _regionMiner: PetriNetRegionSynthesisService,
                minerFactory: IncrementalMinerFactoryService) {
        this.fcIncremental = new FormControl(true);
        this.fcArcWeights = new FormControl(false);
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
        this.loading$ = new BehaviorSubject<boolean>(false);

        // separate caches!
        this._incrementalMinerNoWeights = minerFactory.create(this.pos$.asObservable());
        this._incrementalMinerWeights = minerFactory.create(this.pos$.asObservable());

        this._fcIncrementalSub = this.fcIncremental.valueChanges.subscribe(() => {
            this.mineModel();
        });
        this._fcWeightsSub = this.fcArcWeights.valueChanges.subscribe(() => {
            this.mineModel();
        });
    }

    ngOnDestroy(): void {
        if (this._minerSub) {
            this._minerSub.unsubscribe();
        }
        this._modelSub.unsubscribe();
        this._fcIncrementalSub.unsubscribe();
        this._fcWeightsSub.unsubscribe();

        this.model$.complete();
        this.displayedModel$.complete();
        this.pos$.complete();
        this.loading$.complete();
    }

    processUpload(files: Array<DropFile>) {
        this.loading$.next(true);

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
        this.loading$.next(false);
    }

    updateModel(selectedIndices: Set<number>) {
        if (selectedIndices.size === 0) {
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

    private mineModel() {
        if (this._selectedIndices === undefined || this._selectedIndices.size === 0) {
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
