import {Component} from '@angular/core';
import {
    AlphaOracleService,
    DropFile,
    FD_LOG,
    LogToPartialOrderTransformerService,
    PartialOrderNetWithContainedTraces,
    PetriNet,
    Trace,
    XesLogParserService
} from 'ilpn-components';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {

    fdLog = FD_LOG;

    log: Array<Trace> | undefined;
    pos: Array<PartialOrderNetWithContainedTraces> = [];

    constructor(private _logParser: XesLogParserService,
                private _oracle: AlphaOracleService,
                private _poTransformer: LogToPartialOrderTransformerService) {
    }

    processUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
        if (this.log !== undefined) {
            const concurrency = this._oracle.determineConcurrency(this.log, {
                lookAheadDistance: 1,
                distinguishSameLabels: false
            });
            this.pos = this._poTransformer.transformToPartialOrders(this.log, concurrency);
            this.pos.sort((a, b) => b.net.frequency! - a.net.frequency!);
        }
    }
}
