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
exports.doCheckModel = exports.getEditorIfCanRunTlc = exports.showTlcOutput = exports.stopModelChecking = exports.displayModelChecking = exports.checkModelCustom = exports.runLastCheckAgain = exports.checkModel = exports.CTX_TLC_CAN_RUN_AGAIN = exports.CTX_TLC_RUNNING = exports.CMD_SHOW_TLC_OUTPUT = exports.CMD_CHECK_MODEL_DISPLAY = exports.CMD_CHECK_MODEL_STOP = exports.CMD_CHECK_MODEL_CUSTOM_RUN = exports.CMD_CHECK_MODEL_RUN_AGAIN = exports.CMD_CHECK_MODEL_RUN = void 0;
const vscode = require("vscode");
const path = require("path");
const fs_1 = require("fs");
const tla2tools_1 = require("../tla2tools");
const tlc_1 = require("../parsers/tlc");
const checkResultView_1 = require("../checkResultView");
const diagnostic_1 = require("../diagnostic");
const outputSaver_1 = require("../outputSaver");
const common_1 = require("../common");
const check_1 = require("../model/check");
const outputChannels_1 = require("../outputChannels");
exports.CMD_CHECK_MODEL_RUN = 'tlaplus.model.check.run';
exports.CMD_CHECK_MODEL_RUN_AGAIN = 'tlaplus.model.check.runAgain';
exports.CMD_CHECK_MODEL_CUSTOM_RUN = 'tlaplus.model.check.customRun';
exports.CMD_CHECK_MODEL_STOP = 'tlaplus.model.check.stop';
exports.CMD_CHECK_MODEL_DISPLAY = 'tlaplus.model.check.display';
exports.CMD_SHOW_TLC_OUTPUT = 'tlaplus.showTlcOutput';
exports.CTX_TLC_RUNNING = 'tlaplus.tlc.isRunning';
exports.CTX_TLC_CAN_RUN_AGAIN = 'tlaplus.tlc.canRunAgain';
const CFG_CREATE_OUT_FILES = 'tlaplus.tlc.modelChecker.createOutFiles';
const TEMPLATE_CFG_PATH = path.resolve(__dirname, '../../../tools/template.cfg');
let checkProcess;
let lastCheckFiles;
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
const outChannel = new outputChannels_1.ToolOutputChannel('TLC', mapTlcOutputLine);
class CheckResultHolder {
}
/**
 * Runs TLC on a TLA+ specification.
 */
function checkModel(fileUri, diagnostic, extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = fileUri ? fileUri : getActiveEditorFileUri(extContext);
        if (!uri) {
            return;
        }
        const specFiles = yield getSpecFiles(uri);
        if (!specFiles) {
            return;
        }
        doCheckModel(specFiles, true, extContext, diagnostic);
    });
}
exports.checkModel = checkModel;
function runLastCheckAgain(diagnostic, extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!lastCheckFiles) {
            vscode.window.showWarningMessage('No last check to run');
            return;
        }
        if (!canRunTlc(extContext)) {
            return;
        }
        doCheckModel(lastCheckFiles, true, extContext, diagnostic);
    });
}
exports.runLastCheckAgain = runLastCheckAgain;
function checkModelCustom(diagnostic, extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const editor = getEditorIfCanRunTlc(extContext);
        if (!editor) {
            return;
        }
        const doc = editor.document;
        if (doc.languageId !== common_1.LANG_TLAPLUS) {
            vscode.window.showWarningMessage('File in the active editor is not a .tla, it cannot be checked as a model');
            return;
        }
        const configFiles = yield common_1.listFiles(path.dirname(doc.uri.fsPath), (fName) => fName.endsWith('.cfg'));
        configFiles.sort();
        const cfgFileName = yield vscode.window.showQuickPick(configFiles, { canPickMany: false, placeHolder: 'Select a model config file', matchOnDetail: true });
        if (!cfgFileName || cfgFileName.length === 0) {
            return;
        }
        const specFiles = new check_1.SpecFiles(doc.uri.fsPath, path.join(path.dirname(doc.uri.fsPath), cfgFileName));
        doCheckModel(specFiles, true, extContext, diagnostic);
    });
}
exports.checkModelCustom = checkModelCustom;
/**
 * Reveals model checking view panel.
 */
function displayModelChecking(extContext) {
    checkResultView_1.revealLastCheckResultView(extContext);
}
exports.displayModelChecking = displayModelChecking;
/**
 * Stops the current model checking process.
 */
function stopModelChecking() {
    if (checkProcess) {
        tla2tools_1.stopProcess(checkProcess);
    }
    else {
        vscode.window.showInformationMessage("There're no currently running model checking processes");
    }
}
exports.stopModelChecking = stopModelChecking;
function showTlcOutput() {
    outChannel.revealWindow();
}
exports.showTlcOutput = showTlcOutput;
function getActiveEditorFileUri(extContext) {
    const editor = getEditorIfCanRunTlc(extContext);
    if (!editor) {
        return undefined;
    }
    const doc = editor.document;
    if (doc.languageId !== common_1.LANG_TLAPLUS && doc.languageId !== common_1.LANG_TLAPLUS_CFG) {
        vscode.window.showWarningMessage('File in the active editor is not a .tla or .cfg file, it cannot be checked as a model');
        return undefined;
    }
    return doc.uri;
}
function getEditorIfCanRunTlc(extContext) {
    if (!canRunTlc(extContext)) {
        return undefined;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No editor is active, cannot find a TLA+ model to check');
        return undefined;
    }
    return editor;
}
exports.getEditorIfCanRunTlc = getEditorIfCanRunTlc;
function canRunTlc(extContext) {
    if (checkProcess) {
        vscode.window.showWarningMessage('Another model checking process is currently running', 'Show currently running process').then(() => checkResultView_1.revealLastCheckResultView(extContext));
        return false;
    }
    return true;
}
function doCheckModel(specFiles, showCheckResultView, extContext, diagnostic) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            lastCheckFiles = specFiles;
            vscode.commands.executeCommand('setContext', exports.CTX_TLC_CAN_RUN_AGAIN, true);
            updateStatusBarItem(true);
            const procInfo = yield tla2tools_1.runTlc(specFiles.tlaFilePath, path.basename(specFiles.cfgFilePath));
            outChannel.bindTo(procInfo);
            checkProcess = procInfo.process;
            checkProcess.on('close', () => {
                checkProcess = undefined;
                updateStatusBarItem(false);
            });
            if (showCheckResultView) {
                attachFileSaver(specFiles.tlaFilePath, checkProcess);
                checkResultView_1.revealEmptyCheckResultView(check_1.ModelCheckResultSource.Process, extContext);
            }
            const resultHolder = new CheckResultHolder();
            const stdoutParser = new tlc_1.TlcModelCheckerStdoutParser(check_1.ModelCheckResultSource.Process, checkProcess.stdout, specFiles, true, (checkResult) => {
                resultHolder.checkResult = checkResult;
                if (showCheckResultView) {
                    checkResultView_1.updateCheckResultView(checkResult);
                }
            });
            const dCol = yield stdoutParser.readAll();
            diagnostic_1.applyDCollection(dCol, diagnostic);
            return resultHolder.checkResult;
        }
        catch (err) {
            statusBarItem.hide();
            vscode.window.showErrorMessage(err.message);
        }
        return undefined;
    });
}
exports.doCheckModel = doCheckModel;
function attachFileSaver(tlaFilePath, proc) {
    const createOutFiles = vscode.workspace.getConfiguration().get(CFG_CREATE_OUT_FILES);
    if (typeof (createOutFiles) === 'undefined' || createOutFiles) {
        const outFilePath = common_1.replaceExtension(tlaFilePath, 'out');
        outputSaver_1.saveStreamToFile(proc.stdout, outFilePath);
    }
}
/**
 * Finds all files that needed to run model check.
 */
function getSpecFiles(fileUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const filePath = fileUri.fsPath;
        let specFiles;
        let canRun = true;
        if (filePath.endsWith('.cfg')) {
            specFiles = new check_1.SpecFiles(common_1.replaceExtension(filePath, 'tla'), filePath);
            canRun = yield checkModuleExists(specFiles.tlaFilePath);
        }
        else if (filePath.endsWith('.tla')) {
            specFiles = new check_1.SpecFiles(filePath, common_1.replaceExtension(filePath, 'cfg'));
            canRun = yield checkModelExists(specFiles.cfgFilePath);
        }
        return canRun ? specFiles : undefined;
    });
}
function checkModuleExists(modulePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const moduleExists = yield common_1.exists(modulePath);
        if (!moduleExists) {
            const moduleFile = path.basename(modulePath);
            vscode.window.showWarningMessage(`Corresponding TLA+ module file ${moduleFile} doesn't exist.`);
        }
        return moduleExists;
    });
}
function checkModelExists(cfgPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const cfgExists = yield common_1.exists(cfgPath);
        if (!cfgExists) {
            showConfigAbsenceWarning(cfgPath);
        }
        return cfgExists;
    });
}
function updateStatusBarItem(active) {
    statusBarItem.text = 'TLC' + (active ? ' $(gear~spin)' : '');
    statusBarItem.tooltip = 'TLA+ model checking' + (active ? ' is running' : ' result');
    statusBarItem.command = exports.CMD_CHECK_MODEL_DISPLAY;
    statusBarItem.show();
    vscode.commands.executeCommand('setContext', exports.CTX_TLC_RUNNING, active);
}
function showConfigAbsenceWarning(cfgPath) {
    const fileName = path.basename(cfgPath);
    const createOption = 'Create model file';
    vscode.window.showWarningMessage(`Model file ${fileName} doesn't exist. Cannot check model.`, createOption)
        .then((option) => {
        if (option === createOption) {
            createModelFile(cfgPath);
        }
    });
}
function createModelFile(cfgPath) {
    return __awaiter(this, void 0, void 0, function* () {
        fs_1.copyFile(TEMPLATE_CFG_PATH, cfgPath, (err) => {
            if (err) {
                console.warn(`Error creating config file: ${err}`);
                vscode.window.showWarningMessage(`Cannot create model file: ${err}`);
                return;
            }
            vscode.workspace.openTextDocument(cfgPath)
                .then(doc => vscode.window.showTextDocument(doc));
        });
    });
}
function mapTlcOutputLine(line) {
    if (line === '') {
        return line;
    }
    const cleanLine = line.replace(/@!@!@(START|END)MSG \d+(:\d+)? @!@!@/g, '');
    return cleanLine === '' ? undefined : cleanLine;
}
//# sourceMappingURL=checkModel.js.map