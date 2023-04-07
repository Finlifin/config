"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
const fanyi = require('./fanyi');
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('dictionary.fanyi', () => {
        console.log(selectedText());
        showMsg(selectedText());
        fanyi(selectedText(), { log: showMsg });
    }));
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
const channel = vscode.window.createOutputChannel('dictionary');
function showMsg(msg, indentNum) {
    indentNum = indentNum || 1;
    let indent = '';
    for (let i = 1; i < indentNum; i += 1) {
        indent += '  ';
    }
    channel.appendLine(indent + (msg || '').toString());
    channel.show();
}
function selectedText() {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        return "";
    }
    var selection = editor.selection;
    var text = editor.document.getText(selection);
    return text;
}
//# sourceMappingURL=extension.js.map