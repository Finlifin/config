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
exports.revealLastCheckResultView = exports.revealEmptyCheckResultView = exports.updateCheckResultView = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const check_1 = require("./model/check");
const checkModel_1 = require("./commands/checkModel");
// Cached HTML template for the WebView
let viewHtmlTemplate;
let viewHtml;
let viewPanel;
let currentSource;
let lastProcessCheckResult; // Only results with source=process go here
let lastCheckResult; // The last known check result, no matter what its source is
function updateCheckResultView(checkResult) {
    if (checkResult.source === currentSource) {
        if (viewPanel && viewPanel.visible) {
            viewPanel.webview.postMessage({
                checkResult: checkResult
            });
        }
    }
    lastCheckResult = checkResult;
    if (checkResult.source === check_1.ModelCheckResultSource.Process) {
        lastProcessCheckResult = checkResult;
    }
}
exports.updateCheckResultView = updateCheckResultView;
function revealEmptyCheckResultView(source, extContext) {
    revealCheckResultView(check_1.ModelCheckResult.createEmpty(source), extContext);
}
exports.revealEmptyCheckResultView = revealEmptyCheckResultView;
function revealLastCheckResultView(extContext) {
    if (lastProcessCheckResult) {
        revealCheckResultView(lastProcessCheckResult, extContext);
    }
    else {
        revealEmptyCheckResultView(check_1.ModelCheckResultSource.Process, extContext);
    }
}
exports.revealLastCheckResultView = revealLastCheckResultView;
function revealCheckResultView(checkResult, extContext) {
    currentSource = checkResult.source;
    doRevealCheckResultView(extContext);
    updateCheckResultView(checkResult);
}
function doRevealCheckResultView(extContext) {
    if (!viewPanel) {
        createNewPanel(extContext);
        ensurePanelBody(extContext);
    }
    else {
        viewPanel.reveal();
    }
}
function createNewPanel(extContext) {
    const title = 'TLA+ model checking';
    viewPanel = vscode.window.createWebviewPanel('modelChecking', title, vscode.ViewColumn.Beside, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(extContext.extensionPath, 'resources'))]
    });
    viewPanel.iconPath = {
        dark: vscode.Uri.file(path.join(extContext.extensionPath, 'resources/images/preview-dark.svg')),
        light: vscode.Uri.file(path.join(extContext.extensionPath, 'resources/images/preview-light.svg')),
    };
    viewPanel.onDidDispose(() => {
        viewPanel = undefined;
        viewHtml = undefined;
    });
    viewPanel.webview.onDidReceiveMessage(message => {
        if (message.command === 'init') {
            if (lastCheckResult) {
                // Show what has been missed while the panel was invisible
                updateCheckResultView(lastCheckResult);
            }
        }
        else if (message.command === 'stop') {
            vscode.commands.executeCommand(checkModel_1.CMD_CHECK_MODEL_STOP);
        }
        else if (message.command === 'showTlcOutput') {
            vscode.commands.executeCommand(checkModel_1.CMD_SHOW_TLC_OUTPUT);
        }
        else if (message.command === 'runAgain') {
            vscode.commands.executeCommand(checkModel_1.CMD_CHECK_MODEL_RUN_AGAIN);
        }
        else if (message.command === 'openFile') {
            // `One` is used here because at the moment, VSCode doesn't provide API
            // for revealing existing document, so we're speculating here to reduce open documents duplication.
            revealFile(message.filePath, vscode.ViewColumn.One, message.location.line, message.location.character);
        }
        else if (message.command === 'showInfoMessage') {
            vscode.window.showInformationMessage(message.text);
        }
        else if (message.command === 'showVariableValue') {
            const valStr = lastCheckResult ? lastCheckResult.formatValue(message.valueId) : undefined;
            if (valStr) {
                createDocument(valStr);
            }
        }
    });
}
function ensurePanelBody(extContext) {
    if (!viewPanel) {
        return;
    }
    if (!viewHtmlTemplate) {
        const pagePath = path.join(extContext.extensionPath, 'resources', 'check-result-view.html');
        viewHtmlTemplate = fs.readFileSync(pagePath, 'utf8');
    }
    if (!viewHtml) {
        const resourcesDiskPath = vscode.Uri.file(path.join(extContext.extensionPath, 'resources'));
        const resourcesPath = viewPanel.webview.asWebviewUri(resourcesDiskPath);
        viewHtml = viewHtmlTemplate
            .replace(/\${cspSource}/g, viewPanel.webview.cspSource)
            .replace(/\${resourcesPath}/g, String(resourcesPath));
    }
    viewPanel.webview.html = viewHtml;
}
function revealFile(filePath, viewColumn, line, character) {
    const location = new vscode.Position(line, character);
    const showOpts = {
        selection: new vscode.Range(location, location),
        viewColumn: viewColumn
    };
    vscode.workspace.openTextDocument(filePath)
        .then(doc => vscode.window.showTextDocument(doc, showOpts));
}
function createDocument(text) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = yield vscode.workspace.openTextDocument();
        const editor = yield vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        const zero = new vscode.Position(0, 0);
        yield editor.edit((edit) => edit.insert(zero, text));
        editor.selection = new vscode.Selection(zero, zero);
        editor.revealRange(new vscode.Range(zero, zero), vscode.TextEditorRevealType.AtTop);
    });
}
//# sourceMappingURL=checkResultView.js.map