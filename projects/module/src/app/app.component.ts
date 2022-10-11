import {Component} from '@angular/core';
import {DropFile, FD_LOG, Trace, XesLogParserService} from 'ilpn-components';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {

    fdLog = FD_LOG;

    log: Array<Trace> | undefined;

    constructor(private _logParser: XesLogParserService) {
    }

    processUpload(files: Array<DropFile>) {
        this.log = this._logParser.parse(files[0].content);
    }
}
