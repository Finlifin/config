"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranspilerStdoutParser = void 0;
const vscode = require("vscode");
const outputHandler_1 = require("../outputHandler");
const diagnostic_1 = require("../diagnostic");
class LocationInfo {
    constructor(location, strLength) {
        this.location = location;
        this.strLength = strLength;
    }
}
const ZERO_LOCATION_INFO = new LocationInfo(new vscode.Position(0, 0), 0);
// Error message postfix as defined in PcalDebug.java in the tla toolbox. Excludes the trailing newline since we
// parse one line at a time
const ERROR_POSTFIX = '.';
/**
 * Parses stdout of PlusCal transpiler.
 */
class TranspilerStdoutParser extends outputHandler_1.ProcessOutputHandler {
    constructor(source, filePath) {
        super(source, new diagnostic_1.DCollection());
        this.errMessage = null;
        this.nextLineIsError = false;
        this.result.addFilePath(filePath);
        this.filePath = filePath;
    }
    handleLine(line) {
        if (line === null) {
            if (this.errMessage !== null) {
                this.result.addMessage(this.filePath, new vscode.Range(0, 0, 0, 0), this.errMessage);
            }
            return;
        }
        if (line === '') {
            return;
        }
        // If nextLineIsError is set, we expect the next line to contain a full error message, not just a location
        if (!this.errMessage || this.nextLineIsError) {
            if (this.tryParseUnrecoverableError(line)) {
                return;
            }
        }
        if (this.errMessage) {
            const locInfo = this.parseLocation(line) || ZERO_LOCATION_INFO;
            this.addError(locInfo.location, this.errMessage);
            this.errMessage = null;
        }
    }
    tryParseUnrecoverableError(line) {
        const matchers = /^\s+--\s+(.*)$/g.exec(line);
        if (!matchers && !this.nextLineIsError) {
            return false;
        }
        // matchers should never be null at this point if this.nextLineIsError is false, but the null check can't
        // detect that. Instead, we use the matchersMessage constant which ensures matchers is not indexed if null.
        const matchersMessage = matchers ? matchers[1] : '';
        const message = this.nextLineIsError ? line : matchersMessage;
        if (message.startsWith('Beginning of algorithm string --algorithm not found')) {
            // This error means that there's no PlusCal code in file. Just ignore it.
            return true;
        }
        // If we see the error postfix, we can assume that we have read all error messages
        if (this.nextLineIsError && line.endsWith(ERROR_POSTFIX)) {
            this.nextLineIsError = false;
        }
        // Assume that an empty string message that matches the regex means that the next line is an error. This can
        // happen when the error string looks like:
        // "Unrecoverable error:\n -- \nProcess proc redefined at line 10, column 1\n".
        if (message === '' && matchers) {
            this.nextLineIsError = true;
            return true;
        }
        const locInfo = this.parseLocation(line);
        if (locInfo) {
            this.addError(locInfo.location, message.substring(0, message.length - locInfo.strLength));
            this.errMessage = null;
        }
        else {
            this.errMessage = message;
        }
        return true;
    }
    addError(location, message) {
        const locRange = new vscode.Range(location, location);
        this.result.addMessage(this.filePath, locRange, message);
    }
    parseLocation(line) {
        const rxLocation = /\s*(?:at )?line (\d+), column (\d+).?\s*$/g;
        const matches = rxLocation.exec(line);
        if (!matches) {
            return undefined;
        }
        const posLine = parseInt(matches[1]) - 1;
        const posCol = parseInt(matches[2]);
        return new LocationInfo(new vscode.Position(posLine, posCol), matches[0].length);
    }
}
exports.TranspilerStdoutParser = TranspilerStdoutParser;
//# sourceMappingURL=pluscal.js.map