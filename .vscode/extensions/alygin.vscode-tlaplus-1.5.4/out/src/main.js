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
exports.activate = void 0;
const vscode = require("vscode");
const path = require("path");
const checkModel_1 = require("./commands/checkModel");
const evaluateExpression_1 = require("./commands/evaluateExpression");
const parseModule_1 = require("./commands/parseModule");
const visualizeOutput_1 = require("./commands/visualizeOutput");
const exportModule_1 = require("./commands/exportModule");
const tla_1 = require("./formatters/tla");
const cfg_1 = require("./formatters/cfg");
const actions_1 = require("./actions");
const tlaSymbols_1 = require("./symbols/tlaSymbols");
const common_1 = require("./common");
const tlaCompletions_1 = require("./completions/tlaCompletions");
const cfgCompletions_1 = require("./completions/cfgCompletions");
const tlaDeclarations_1 = require("./declarations/tlaDeclarations");
const documentInfo_1 = require("./model/documentInfo");
const tlcStatisticsCfg_1 = require("./commands/tlcStatisticsCfg");
const TLAPLUS_FILE_SELECTOR = { scheme: 'file', language: common_1.LANG_TLAPLUS };
const TLAPLUS_CFG_FILE_SELECTOR = { scheme: 'file', language: common_1.LANG_TLAPLUS_CFG };
const CHANGELOG_URL = vscode.Uri.parse('https://github.com/alygin/vscode-tlaplus/blob/master/CHANGELOG.md#change-log');
const tlaDocInfos = new documentInfo_1.TlaDocumentInfos();
// Holds all the error messages
let diagnostic;
/**
 * Extension entry point.
 */
function activate(context) {
    diagnostic = vscode.languages.createDiagnosticCollection(common_1.LANG_TLAPLUS);
    context.subscriptions.push(vscode.commands.registerCommand(parseModule_1.CMD_PARSE_MODULE, () => parseModule_1.parseModule(diagnostic)), vscode.commands.registerCommand(exportModule_1.CMD_EXPORT_TLA_TO_TEX, () => exportModule_1.exportModuleToTex(context)), vscode.commands.registerCommand(exportModule_1.CMD_EXPORT_TLA_TO_PDF, () => exportModule_1.exportModuleToPdf(context)), vscode.commands.registerCommand(checkModel_1.CMD_CHECK_MODEL_RUN, (uri) => checkModel_1.checkModel(uri, diagnostic, context)), vscode.commands.registerCommand(checkModel_1.CMD_CHECK_MODEL_RUN_AGAIN, () => checkModel_1.runLastCheckAgain(diagnostic, context)), vscode.commands.registerCommand(checkModel_1.CMD_CHECK_MODEL_CUSTOM_RUN, () => checkModel_1.checkModelCustom(diagnostic, context)), vscode.commands.registerCommand(checkModel_1.CMD_SHOW_TLC_OUTPUT, () => checkModel_1.showTlcOutput()), vscode.commands.registerCommand(checkModel_1.CMD_CHECK_MODEL_STOP, () => checkModel_1.stopModelChecking()), vscode.commands.registerCommand(checkModel_1.CMD_CHECK_MODEL_DISPLAY, () => checkModel_1.displayModelChecking(context)), vscode.commands.registerCommand(visualizeOutput_1.CMD_VISUALIZE_TLC_OUTPUT, () => visualizeOutput_1.visualizeTlcOutput(context)), vscode.commands.registerCommand(evaluateExpression_1.CMD_EVALUATE_SELECTION, () => evaluateExpression_1.evaluateSelection(diagnostic, context)), vscode.commands.registerCommand(evaluateExpression_1.CMD_EVALUATE_EXPRESSION, () => evaluateExpression_1.evaluateExpression(diagnostic, context)), vscode.languages.registerCodeActionsProvider(TLAPLUS_FILE_SELECTOR, new actions_1.TlaCodeActionProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.Source] }), vscode.languages.registerOnTypeFormattingEditProvider(TLAPLUS_FILE_SELECTOR, new tla_1.TlaOnTypeFormattingEditProvider(), '\n', 'd', 'e', 'f', 'r'), vscode.languages.registerOnTypeFormattingEditProvider(TLAPLUS_CFG_FILE_SELECTOR, new cfg_1.CfgOnTypeFormattingEditProvider(), '\n'), vscode.languages.registerDocumentSymbolProvider(TLAPLUS_FILE_SELECTOR, new tlaSymbols_1.TlaDocumentSymbolsProvider(tlaDocInfos), { label: 'TLA+' }), vscode.languages.registerCompletionItemProvider(TLAPLUS_FILE_SELECTOR, new tlaCompletions_1.TlaCompletionItemProvider(tlaDocInfos)), vscode.languages.registerCompletionItemProvider(TLAPLUS_CFG_FILE_SELECTOR, new cfgCompletions_1.CfgCompletionItemProvider()), vscode.languages.registerDeclarationProvider(TLAPLUS_FILE_SELECTOR, new tlaDeclarations_1.TlaDeclarationsProvider(tlaDocInfos)), vscode.languages.registerDefinitionProvider(TLAPLUS_FILE_SELECTOR, new tlaDeclarations_1.TlaDefinitionsProvider(tlaDocInfos)));
    tlcStatisticsCfg_1.syncTlcStatisticsSetting()
        .catch((err) => console.error(err))
        .then(() => tlcStatisticsCfg_1.listenTlcStatConfigurationChanges(context.subscriptions));
    showChangeLog(context.extensionPath)
        .catch((err) => console.error(err));
}
exports.activate = activate;
function showChangeLog(extPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const pkgData = yield common_1.readFile(`${extPath}${path.sep}package.json`);
        const curVersion = JSON.parse(pkgData).version;
        const prevFilePath = `${extPath}${path.sep}version`;
        let prevVersion;
        if (yield common_1.exists(prevFilePath)) {
            prevVersion = yield common_1.readFile(prevFilePath);
        }
        if (getMajorMinor(curVersion) === getMajorMinor(prevVersion)) {
            return;
        }
        yield common_1.writeFile(prevFilePath, curVersion);
        const showOpt = 'Show changelog';
        const dismissOpt = 'Dismiss';
        const opt = yield vscode.window.showInformationMessage('TLA+ extension has been updated.', showOpt, dismissOpt);
        if (opt === showOpt) {
            vscode.commands.executeCommand('vscode.open', CHANGELOG_URL);
        }
    });
}
function getMajorMinor(version) {
    if (!version || version === '') {
        return undefined;
    }
    const matches = /^(\d+.\d+)/g.exec(version);
    return matches ? matches[1] : undefined;
}
//# sourceMappingURL=main.js.map