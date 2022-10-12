import {Component, OnDestroy} from '@angular/core';
import {
    AlphaOracleService,
    DropFile,
    FD_LOG,
    LogCleaner,
    LogToPartialOrderTransformerService,
    PartialOrderNetWithContainedTraces,
    PetriNet,
    PetriNetSerialisationService,
    PrimeMinerService,
    Trace,
    XesLogParserService
} from 'ilpn-components';
import {Subscription} from 'rxjs';
import {FormControl} from '@angular/forms';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent extends LogCleaner implements OnDestroy {

    private _sub: Subscription | undefined;

    fdLog = FD_LOG;

    log: Array<Trace> | undefined;
    pos: Array<PartialOrderNetWithContainedTraces> = [];

    model: PetriNet | undefined;

    fc: FormControl;

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService,
                private _primeMiner: PrimeMinerService,
                private _serialisationService: PetriNetSerialisationService) {
        super();
        this.fc = new FormControl('');
    }

    ngOnDestroy(): void {
        if (this._sub) {
            this._sub.unsubscribe();
        }
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

    updateModel(selectedIndex: number) {
        const nets = [];
        for (let i = 0; i <= selectedIndex && i < this.pos.length; i++) {
            nets.push(this.pos[i]);
        }
        if (nets.length === 0) {
            return;
        }

        this._sub = this._primeMiner.mine(nets, {
            oneBoundRegions: true
        }).subscribe(r => {
            this.model = r.net;
            this.fc.setValue(this._serialisationService.serialise(this.model));
        });
    }
}
