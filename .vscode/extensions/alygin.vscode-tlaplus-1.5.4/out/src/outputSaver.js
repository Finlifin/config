"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveStreamToFile = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path_1 = require("path");
const OPEN_MODE = fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC;
class StreamWriter {
    constructor(fd) {
        this.fd = fd;
    }
}
/**
 * Writes all the data from a stream to the given file.
 */
function saveStreamToFile(src, filePath) {
    fs.open(filePath, OPEN_MODE, (err, fd) => {
        if (err) {
            const fileName = path_1.basename(filePath);
            vscode.window.showWarningMessage(`Cannot open file ${fileName}: ${err}`);
            return;
        }
        const sw = new StreamWriter(fd);
        src === null || src === void 0 ? void 0 : src.on('data', (data) => writeToFile(sw, data));
        src === null || src === void 0 ? void 0 : src.on('end', () => closeFile(sw));
    });
}
exports.saveStreamToFile = saveStreamToFile;
function writeToFile(sw, chunk) {
    if (!sw.fd) {
        return;
    }
    fs.write(sw.fd, chunk, (err) => {
        if (err) {
            vscode.window.showWarningMessage(`Error writing .out file: ${err}`);
            closeFile(sw);
        }
    });
}
function closeFile(sw) {
    if (!sw.fd) {
        return;
    }
    fs.close(sw.fd, (err) => {
        sw.fd = undefined;
        if (err) {
            vscode.window.showWarningMessage(`Error closing .out file: ${err}`);
        }
    });
}
//# sourceMappingURL=outputSaver.js.map