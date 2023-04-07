"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessOutputHandler = void 0;
const stream_1 = require("stream");
const common_1 = require("./common");
const CHAR_RETURN = 13;
/**
 * Auxiliary class that reads chunks from the given stream or array, breaks data into lines
 * and sends them to the handling method line by line.
 */
class ProcessOutputHandler {
    constructor(source, initialResult) {
        this.closed = false;
        this.buf = null;
        if (source instanceof stream_1.Readable) {
            source.on('data', chunk => this.handleData(chunk));
            source.on('end', () => this.handleData(null));
        }
        else {
            this.lines = source === null ? [] : source;
        }
        this.result = initialResult;
    }
    /**
     * Reads the stream to the end, parsing all the lines.
     */
    readAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.resolve = resolve;
            });
        });
    }
    /**
     * Handles the source synchronously.
     * For this method to work, the source of the lines must be an array of l.
     */
    readAllSync() {
        if (!this.lines) {
            throw new common_1.ParsingError('Cannot handle synchronously because the source is not a set of lines');
        }
        this.lines.forEach(l => {
            this.tryHandleLine(l);
        });
        this.tryHandleLine(null);
        if (!this.result) {
            throw new Error('No handling result returned');
        }
        return this.result;
    }
    handleError(err) {
        // Do nothing by default
    }
    handleData(chunk) {
        if (this.closed) {
            throw new Error('Stream is closed.');
        }
        if (chunk === null) {
            this.tryHandleLine(this.buf);
            this.buf = null;
            this.closed = true;
            if (this.resolve) {
                this.resolve(this.result);
            }
            return;
        }
        const str = String(chunk);
        const eChunk = this.buf === null ? str : this.buf + str;
        const lines = eChunk.split('\n');
        if (str.endsWith('\n')) {
            this.buf = null;
            lines.pop();
        }
        else {
            this.buf = lines.pop() || null;
        }
        lines.forEach(line => this.tryHandleLine(line));
    }
    tryHandleLine(line) {
        try {
            // On Windows, the last 0x0A character is still in the line, cut it off
            const eLine = line && line.charCodeAt(line.length - 1) === CHAR_RETURN
                ? line.substring(0, line.length - 1)
                : line;
            this.handleLine(eLine);
        }
        catch (err) {
            this.handleError(err);
            console.error(`Error handling output line: ${err}`);
        }
    }
}
exports.ProcessOutputHandler = ProcessOutputHandler;
//# sourceMappingURL=outputHandler.js.map