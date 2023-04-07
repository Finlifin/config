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
exports.evaluateExpression = exports.evaluateSelection = exports.CMD_EVALUATE_EXPRESSION = exports.CMD_EVALUATE_SELECTION = void 0;
const vscode = require("vscode");
const path = require("path");
const common_1 = require("../common");
const checkModel_1 = require("./checkModel");
const customModel_1 = require("./customModel");
const outputChannels_1 = require("../outputChannels");
const check_1 = require("../model/check");
const tlcValues_1 = require("../parsers/tlcValues");
exports.CMD_EVALUATE_SELECTION = 'tlaplus.evaluateSelection';
exports.CMD_EVALUATE_EXPRESSION = 'tlaplus.evaluateExpression';
const EXPR_MARKER = '$!@$!@$!@$!@$!';
let lastEvaluatedExpression;
const outChannel = new outputChannels_1.ToolOutputChannel('TLA+ evaluation');
/**
 * Evaluates the expression, currently selected in the active editor.
 */
function evaluateSelection(diagnostic, extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const editor = checkModel_1.getEditorIfCanRunTlc(extContext);
        if (!editor) {
            return;
        }
        const selRange = new vscode.Range(editor.selection.start, editor.selection.end);
        const selText = editor.document.getText(selRange);
        doEvaluateExpression(editor, selText, diagnostic, extContext);
    });
}
exports.evaluateSelection = evaluateSelection;
/**
 * Asks the user to enter an expression and evalutes it in the context of the specification from the active editor.
 */
function evaluateExpression(diagnostic, extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const editor = checkModel_1.getEditorIfCanRunTlc(extContext);
        if (!editor) {
            return;
        }
        vscode.window.showInputBox({
            value: lastEvaluatedExpression,
            prompt: 'Enter a TLA+ expression to evaluate',
            ignoreFocusOut: true
        }).then((expr) => {
            if (!expr) {
                return;
            }
            lastEvaluatedExpression = expr;
            doEvaluateExpression(editor, expr, diagnostic, extContext);
        });
    });
}
exports.evaluateExpression = evaluateExpression;
function doEvaluateExpression(editor, expr, diagnostic, extContext) {
    return __awaiter(this, void 0, void 0, function* () {
        const eExpr = expr.trim();
        if (eExpr === '') {
            vscode.window.showWarningMessage('Nothing to evaluate.');
            return;
        }
        yield editor.document.save();
        const tlaFilePath = editor.document.uri.fsPath;
        const cfgFilePath = common_1.replaceExtension(tlaFilePath, 'cfg');
        const cfgExists = yield common_1.exists(cfgFilePath);
        const constants = cfgExists ? yield extractConstants(cfgFilePath) : [];
        const num = (new Date().getTime());
        const model = yield customModel_1.createCustomModel(tlaFilePath, [
            `E_${num} ==`,
            expr,
            `ASSUME PrintT(<<"${EXPR_MARKER}", E_${num}>>)`,
            `VARIABLES v_${num}`,
            `Init_${num} == FALSE /\\ v_${num} = 0`,
            `Next_${num} == FALSE /\\ v_${num}' = v_${num}`
        ], constants.concat([
            `INIT Init_${num}`,
            `NEXT Next_${num}`
        ]));
        if (!model) {
            return;
        }
        const specFiles = new check_1.SpecFiles(path.join(model.dirPath, model.tlaFileName), path.join(model.dirPath, model.cfgFileName));
        outChannel.clear();
        outChannel.appendLine(`Evaluating constant expression:\n${expr}\n`);
        outChannel.revealWindow();
        const checkResult = yield checkModel_1.doCheckModel(specFiles, false, extContext, diagnostic);
        displayResult(checkResult);
        common_1.deleteDir(model.dirPath);
    });
}
function extractConstants(cfgFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const lines = (yield common_1.readFile(cfgFilePath)).split('\n');
        const constants = [];
        let constLine = false;
        // eslint-disable-next-line max-len
        const wordsRegex = /^\s*(SPECIFICATION|INVARIANT(S)?|PROPERT(Y|IES)|INIT|NEXT|SYMMETRY|CONSTRAINT(S)?|ACTION_CONSTRAINT(S)?|VIEW|CHECK_DEADLOCK|POSTCONDITION)\b/g;
        for (const line of lines) {
            if (/^\s*CONSTANT(S)?\b/g.test(line)) {
                constLine = true;
            }
            else if (wordsRegex.test(line)) {
                constLine = false;
            }
            if (constLine && line !== '') {
                constants.push(line);
            }
        }
        return constants;
    });
}
function displayResult(checkResult) {
    if (!checkResult) {
        outChannel.appendLine('Error evaluating expression');
        return;
    }
    if (checkResult.state !== check_1.CheckState.Success) {
        outChannel.appendLine('Error evaluating expression:');
        checkResult.errors.forEach((err) => {
            err.lines.forEach((line) => outChannel.appendLine(line.toString()));
        });
        return;
    }
    const valLines = extractCalculatedExpressionLines(checkResult.outputLines);
    let exprVal;
    if (valLines.length > 0) {
        const val = tlcValues_1.parseVariableValue('', valLines);
        exprVal = extractCalculatedExpressionValue(val);
    }
    outChannel.appendLine(exprVal || 'Error: Expression value output not found.');
    outChannel.revealWindow(); // VS Code sometimes swithes the window to TLC output, so we need to get it back
}
function extractCalculatedExpressionLines(outLines) {
    const lines = [];
    for (const outLine of outLines) {
        const text = outLine.text;
        if (lines.length > 0 || (lines.length === 0 && text.indexOf(EXPR_MARKER) >= 0)) {
            for (let i = 0; i < outLine.count; i++) {
                lines.push(text);
            }
        }
        if (lines.length > 0 && text.endsWith('>>')) {
            break;
        }
    }
    return lines;
}
function extractCalculatedExpressionValue(val) {
    if (!(val instanceof check_1.SequenceValue)) {
        return undefined;
    }
    if (val.items.length !== 2) {
        return undefined;
    }
    return val.items[0].str === `"${EXPR_MARKER}"` ? val.items[1].str : undefined;
}
//# sourceMappingURL=evaluateExpression.js.map