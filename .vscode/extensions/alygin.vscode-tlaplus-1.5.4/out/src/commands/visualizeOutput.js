"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visualizeTlcOutput = exports.CMD_VISUALIZE_TLC_OUTPUT = void 0;
const vscode = require("vscode");
const fs = require("fs");
const stream_1 = require("stream");
const tlc_1 = require("../parsers/tlc");
const checkResultView_1 = require("../checkResultView");
const check_1 = require("../model/check");
exports.CMD_VISUALIZE_TLC_OUTPUT = 'tlaplus.out.visualize';
/**
 * Opens a panel with visualization of the TLC output file (.out).
 */
function visualizeTlcOutput(extContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No editor is active, cannot find an .out file to visualize');
        return;
    }
    const filePath = editor.document.fileName;
    if (!filePath.endsWith('.out')) {
        vscode.window.showWarningMessage('File in the active editor is not an .out file, it cannot be visualized');
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            vscode.window.showErrorMessage(`Cannot read file: ${err}`);
            return;
        }
        showOutput(data, extContext);
    });
}
exports.visualizeTlcOutput = visualizeTlcOutput;
function showOutput(buffer, extContext) {
    const stream = new stream_1.PassThrough();
    stream.end(buffer);
    checkResultView_1.revealEmptyCheckResultView(check_1.ModelCheckResultSource.OutFile, extContext);
    const parser = new tlc_1.TlcModelCheckerStdoutParser(check_1.ModelCheckResultSource.OutFile, stream, undefined, false, checkResultView_1.updateCheckResultView);
    parser.readAll();
}
//# sourceMappingURL=visualizeOutput.js.map