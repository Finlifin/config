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
exports.exportModuleToPdf = exports.exportModuleToTex = exports.CMD_EXPORT_TLA_TO_PDF = exports.CMD_EXPORT_TLA_TO_TEX = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const common_1 = require("../common");
const tla2tools_1 = require("../tla2tools");
const outputChannels_1 = require("../outputChannels");
exports.CMD_EXPORT_TLA_TO_TEX = 'tlaplus.exportToTex';
exports.CMD_EXPORT_TLA_TO_PDF = 'tlaplus.exportToPdf';
const CFG_PDF_CONVERT_COMMAND = 'tlaplus.pdf.convertCommand';
const NO_ERROR = 0;
const PDF_VIEWER_EXTENSION = 'tomoki1207.pdf';
const PDF_VIEWER_VIEW_ID = 'pdf.preview';
const texOutChannel = new outputChannels_1.ToolOutputChannel('TLA+ to LaTeX');
const pdfOutChannel = new outputChannels_1.ToolOutputChannel('TLA+ to PDF');
class PdfToolInfo {
    constructor(command, args) {
        this.command = command;
        this.args = args;
    }
}
/**
 * Runs tla2tex tool on the currently open TLA+ module.
 */
function exportModuleToTex(extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = getDocumentIfCanRun('LaTeX');
        if (!doc) {
            return;
        }
        generateTexFile(doc.uri.fsPath, true);
    });
}
exports.exportModuleToTex = exportModuleToTex;
/**
 * Runs generates a .tex file for the currently open TLA+ module and runs tex-to-pdf converter on it.
 */
function exportModuleToPdf(extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = getDocumentIfCanRun('PDF');
        if (!doc) {
            return;
        }
        const tlaFilePath = doc.uri.fsPath;
        const texGenerated = yield generateTexFile(tlaFilePath, false);
        if (!texGenerated) {
            return;
        }
        generatePdfFile(tlaFilePath);
    });
}
exports.exportModuleToPdf = exportModuleToPdf;
function generateTexFile(tlaFilePath, notifySuccess) {
    return __awaiter(this, void 0, void 0, function* () {
        const procInfo = yield tla2tools_1.runTex(tlaFilePath);
        texOutChannel.bindTo(procInfo);
        return new Promise((resolve, reject) => {
            procInfo.process.on('close', (exitCode) => {
                if (exitCode !== NO_ERROR) {
                    texOutChannel.revealWindow();
                    resolve(false);
                    return;
                }
                const fileName = path.basename(tlaFilePath);
                const texName = common_1.replaceExtension(fileName, 'tex');
                const dviName = common_1.replaceExtension(fileName, 'dvi');
                removeTempFiles(tlaFilePath, 'log', 'aux');
                if (notifySuccess) {
                    vscode.window.showInformationMessage(`${texName} and ${dviName} generated.`);
                }
                resolve(true);
            });
        });
    });
}
function generatePdfFile(tlaFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const pdfToolInfo = yield getPdfToolInfo(path.basename(tlaFilePath));
        if (!pdfToolInfo) {
            return;
        }
        const proc = child_process_1.spawn(pdfToolInfo.command, pdfToolInfo.args, { cwd: path.dirname(tlaFilePath) });
        const cmdLine = [pdfToolInfo.command].concat(pdfToolInfo.args).join(' ');
        const procInfo = new tla2tools_1.ToolProcessInfo(cmdLine, proc);
        pdfOutChannel.bindTo(procInfo);
        proc.on('error', common_1.emptyFunc); // Without this line, the `close` even doesn't fire in case of invalid command
        proc.on('close', (exitCode) => {
            if (exitCode !== NO_ERROR) {
                vscode.window.showErrorMessage(`Error generating PDF: exit code ${exitCode}`);
                pdfOutChannel.revealWindow();
                return;
            }
            notifyPdfIsReady(common_1.replaceExtension(tlaFilePath, 'pdf'));
            removeTempFiles(tlaFilePath, 'log', 'aux');
        });
    });
}
function removeTempFiles(baseFilePath, ...extensions) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const ext of extensions) {
            yield removeFile(common_1.replaceExtension(baseFilePath, ext));
        }
    });
}
function removeFile(filePath) {
    return new Promise((resolve) => {
        fs.unlink(filePath, () => resolve());
    });
}
function getDocumentIfCanRun(format) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage(`No editor is active, cannot export a TLA+ module to ${format}.`);
        return undefined;
    }
    if (editor.document.languageId !== common_1.LANG_TLAPLUS) {
        vscode.window.showWarningMessage(`File in the active editor is not a TLA+ file, it cannot be exported to ${format}.`);
        return undefined;
    }
    return editor.document;
}
function getPdfToolInfo(texFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const pdfCmd = (vscode.workspace.getConfiguration().get(CFG_PDF_CONVERT_COMMAND) || '').trim();
        if (pdfCmd === '') {
            vscode.window.showWarningMessage('PDF generation command not specified. Check the extension settings.');
            return Promise.resolve(undefined);
        }
        const srcFile = common_1.replaceExtension(path.basename(texFilePath), 'tex');
        const args = [];
        if (pdfCmd.endsWith('pdflatex') || pdfCmd.endsWith('pdflatex.exe')) {
            args.push('-interaction', 'nonstopmode');
        }
        args.push(srcFile);
        return Promise.resolve(new PdfToolInfo(pdfCmd, args));
    });
}
function notifyPdfIsReady(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileName = path.basename(filePath);
        const pdfOptions = [];
        const pdfExt = vscode.extensions.getExtension(PDF_VIEWER_EXTENSION);
        const showPdfOption = 'Show PDF';
        if (pdfExt) {
            if (!pdfExt.isActive) {
                yield pdfExt.activate();
            }
            pdfOptions.push(showPdfOption);
        }
        const option = yield vscode.window.showInformationMessage(`${fileName} generated.`, ...pdfOptions);
        if (option === showPdfOption) {
            vscode.commands.executeCommand('vscode.openWith', common_1.pathToUri(filePath), PDF_VIEWER_VIEW_ID)
                .then(common_1.emptyFunc, (reason) => vscode.window.showErrorMessage(`Cannot display PDF: ${reason}`));
        }
    });
}
//# sourceMappingURL=exportModule.js.map