"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaVersionParser = void 0;
const outputHandler_1 = require("../outputHandler");
const tla2tools_1 = require("../tla2tools");
/**
 * Parses `java -version` output.
 */
class JavaVersionParser extends outputHandler_1.ProcessOutputHandler {
    constructor(source) {
        super(source, new tla2tools_1.JavaVersion(tla2tools_1.JavaVersion.UNKNOWN_VERSION, []));
        this.version = tla2tools_1.JavaVersion.UNKNOWN_VERSION;
        this.outLines = [];
    }
    handleLine(line) {
        if (line === null) {
            this.result = new tla2tools_1.JavaVersion(this.version, this.outLines);
            return;
        }
        this.outLines.push(line);
        if (this.version !== tla2tools_1.JavaVersion.UNKNOWN_VERSION) {
            return;
        }
        const rxVersion = /version "(.+)"/g;
        const matches = rxVersion.exec(line);
        if (matches) {
            this.version = matches[1];
        }
    }
}
exports.JavaVersionParser = JavaVersionParser;
//# sourceMappingURL=javaVersion.js.map