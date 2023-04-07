"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlaDocumentSymbolsProvider = exports.PLUS_CAL_DEFAULT_NAME = exports.ROOT_CONTAINER_NAME = exports.ROOT_SYMBOL_NAME = void 0;
const vscode = require("vscode");
const documentInfo_1 = require("../model/documentInfo");
const COMMA_LEN = 1;
exports.ROOT_SYMBOL_NAME = '*';
exports.ROOT_CONTAINER_NAME = '';
exports.PLUS_CAL_DEFAULT_NAME = 'PlusCal algorithm';
var SpecialSymbol;
(function (SpecialSymbol) {
    SpecialSymbol[SpecialSymbol["PlusCalEnd"] = 0] = "PlusCalEnd";
})(SpecialSymbol || (SpecialSymbol = {}));
/**
 * Holds information about currently parsing module (an actual TLA+ module or PlusCal algorithm)
 */
class ModuleContext {
    constructor(rootSymbol, containerName = rootSymbol.name) {
        this.rootSymbol = rootSymbol;
        this.containerName = containerName;
        this.symbols = [];
        this.symbols.push(rootSymbol);
    }
    addSymbol(symbol) {
        this.symbols.push(symbol);
    }
    close(end) {
        this.rootSymbol.location.range = new vscode.Range(this.rootSymbol.location.range.start, end);
    }
    convert() {
        return new documentInfo_1.Module(this.rootSymbol.name, this.symbols, this.rootSymbol.location.range);
    }
}
class ParsingContext {
    constructor(document) {
        this.modules = [];
        const zeroPos = new vscode.Position(0, 0);
        const rootSymbol = new vscode.SymbolInformation(// Represents the whole document
        exports.ROOT_SYMBOL_NAME, vscode.SymbolKind.Namespace, exports.ROOT_CONTAINER_NAME, new vscode.Location(document.uri, new vscode.Range(zeroPos, zeroPos)));
        this.rootModule = new ModuleContext(rootSymbol, '');
        this.currentModule = this.rootModule;
    }
    isInRoot() {
        return this.currentModule === this.rootModule;
    }
    isInPlusCal() {
        return this.plusCal && this.currentModule === this.plusCal ? true : false;
    }
    startPlusCal(rootSymbol) {
        this.startModule(rootSymbol, true);
    }
    startModule(rootSymbol, plusCal = false) {
        const module = new ModuleContext(rootSymbol);
        this.modules.push(module);
        this.currentModule = module;
        if (plusCal) {
            this.plusCal = module;
        }
        return module;
    }
    closeModule(end) {
        if (this.currentModule) {
            this.currentModule.close(end);
            this.currentModule = this.rootModule;
        }
    }
}
/**
 * Provides TLA+ symbols from the given document.
 */
class TlaDocumentSymbolsProvider {
    constructor(docInfos) {
        this.docInfos = docInfos;
    }
    provideDocumentSymbols(document, token) {
        var _a;
        const context = new ParsingContext(document);
        let lastLine = undefined;
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            lastLine = line;
            if (line.isEmptyOrWhitespace) {
                continue;
            }
            const sym = this.tryExtractSymbol(context, document, line);
            if (!sym) {
                this.tryExtractSpecialSymbol(context, line);
            }
        }
        if (context.currentModule && lastLine) {
            context.closeModule(lastLine.range.end);
        }
        let symbols = context.rootModule.symbols.filter(s => s.name !== exports.ROOT_SYMBOL_NAME);
        for (const modCtx of context.modules) {
            symbols = symbols.concat(modCtx.symbols);
        }
        this.docInfos.set(document.uri, new documentInfo_1.TlaDocumentInfo(context.rootModule.convert(), (_a = context.plusCal) === null || _a === void 0 ? void 0 : _a.convert(), context.modules.map(m => m.convert()), symbols.slice()));
        if (context.plusCal) {
            symbols = symbols.concat(context.plusCal.symbols);
        }
        return symbols;
    }
    tryExtractSymbol(context, document, line) {
        const moduleStart = this.tryStartTlaModule(context, document, line);
        if (moduleStart) {
            return true;
        }
        if (context.isInRoot() && this.tryStartPlusCal(context, document.uri, line)) {
            return true;
        }
        if (this.tryEndModule(context, line)) {
            return true;
        }
        const module = context.currentModule;
        if (typeof module.simpleListSymbolKind !== 'undefined') {
            if (this.tryCollectListItems(module, document.uri, line.lineNumber, 0, line.text)) {
                return true;
            }
        }
        if (this.tryExtractDefinition(module, document, line)) {
            return true;
        }
        if (this.tryExtractListStart(module, document.uri, line)) {
            return true;
        }
        if (this.tryExtractTheoremAxiomLemma(module, document.uri, line)) {
            return true;
        }
        return false;
    }
    tryExtractSpecialSymbol(context, line) {
        const symbol = this.tryExtractPlusCalEnd(line);
        if (typeof symbol === 'undefined') {
            return false;
        }
        if (symbol === SpecialSymbol.PlusCalEnd && context.isInPlusCal()) {
            context.closeModule(line.range.end);
            context.plusCal = undefined;
        }
        return true;
    }
    tryStartTlaModule(context, document, line) {
        const matches = /^\s*-{4,}\s*MODULE\s*(\w+)\s*-{4,}.*$/g.exec(line.text);
        if (!matches) {
            return false;
        }
        const lastLine = document.lineAt(document.lineCount - 1);
        const symbol = new vscode.SymbolInformation(matches[1], vscode.SymbolKind.Module, exports.ROOT_CONTAINER_NAME, new vscode.Location(document.uri, new vscode.Range(line.range.start, lastLine.range.end)));
        context.startModule(symbol);
        return true;
    }
    tryEndModule(context, line) {
        const matches = /^={4,}\s*$/g.exec(line.text);
        if (!matches) {
            return false;
        }
        context.closeModule(line.range.end);
        return true;
    }
    tryExtractDefinition(module, document, line) {
        const matches = /^((?:\s|LET|\/\\)*)(\w+)\s*([(|[)].*)?\s*==\s*(.*)?/g.exec(line.text);
        if (!matches) {
            return false;
        }
        const prefix = matches[1];
        const name = matches[2];
        const blockStart = new vscode.Position(line.range.start.line, prefix.length);
        const ltp = module.lastTopDefBlock;
        if (ltp
            && line.range.start.line >= ltp.location.range.start.line
            && line.range.end.line <= ltp.location.range.end.line
            && prefix.length > module.rootSymbol.location.range.start.character) {
            // This looks like a private variable within a top level definition
            module.addSymbol(new vscode.SymbolInformation(name, vscode.SymbolKind.Variable, ltp.name, new vscode.Location(document.uri, blockStart)));
            return true;
        }
        // This is a top level definition
        let kind = vscode.SymbolKind.Field;
        const next = matches[3];
        const value = matches[4];
        if (next && (next[0] === '(' || next[0] === '[')) {
            kind = vscode.SymbolKind.Function;
        }
        else if (value && value.startsWith('INSTANCE')) {
            kind = vscode.SymbolKind.Namespace;
        }
        const blockEnd = findBlockDefinitionEnd(document, line, blockStart.character).range.end;
        const symbol = new vscode.SymbolInformation(name, kind, module.containerName, new vscode.Location(document.uri, new vscode.Range(blockStart, blockEnd)));
        module.addSymbol(symbol);
        module.lastTopDefBlock = symbol;
        return true;
    }
    tryExtractListStart(module, docUri, line) {
        const matches = /^(\s*)(VARIABLE(?:S)?|CONSTANT(?:S)?)(\s*.*)/g.exec(line.text);
        if (!matches) {
            return false;
        }
        module.simpleListSymbolKind = matches[2].startsWith('V')
            ? vscode.SymbolKind.Variable
            : vscode.SymbolKind.Constant;
        const startIdx = matches[1].length + matches[2].length;
        return this.tryCollectListItems(module, docUri, line.lineNumber, startIdx, matches[3]);
    }
    tryCollectListItems(module, docUri, lineNum, startChar, text) {
        if (!module.simpleListSymbolKind) {
            return false;
        }
        let charIdx = startChar;
        const chunks = text.split(',');
        let name;
        for (const chunk of chunks) {
            const rChunk = chunk.trimLeft();
            if (isCommentStart(rChunk)) {
                return true;
            }
            charIdx += chunk.length - rChunk.length; // + number of trimmed spaces
            const matches = /^(\w*)(\s*)(.*)$/g.exec(rChunk);
            if (!matches) {
                module.simpleListSymbolKind = undefined;
                return false;
            }
            name = matches[1];
            const spaces = matches[2];
            const rest = matches[3];
            if (name === '') {
                charIdx += COMMA_LEN;
                continue;
            }
            if (rest !== '' && !isCommentStart(rest)) {
                module.simpleListSymbolKind = undefined;
                return false;
            }
            module.addSymbol(new vscode.SymbolInformation(name, module.simpleListSymbolKind, module.containerName, new vscode.Location(docUri, new vscode.Position(lineNum, charIdx))));
            charIdx += name.length + spaces.length + COMMA_LEN;
            if (rest !== '') {
                module.simpleListSymbolKind = undefined;
                break; // There were no comma after the name
            }
        }
        if (name !== '') {
            module.simpleListSymbolKind = undefined; // There were no comma after the last name
        }
        return true;
    }
    tryExtractTheoremAxiomLemma(module, docUri, line) {
        const matches = /^\s*(?:THEOREM|AXIOM|LEMMA)\s*(\w+)\s*==/g.exec(line.text);
        if (!matches) {
            return false;
        }
        module.addSymbol(new vscode.SymbolInformation(matches[1], vscode.SymbolKind.Boolean, module.containerName, new vscode.Location(docUri, line.range.start)));
        return true;
    }
    tryStartPlusCal(context, docUri, line) {
        const matches = /(\(\*.*)--((?:fair\s+)?algorithm)\b\s*/g.exec(line.text);
        if (!matches) {
            return false;
        }
        const algName = line.text.substring(matches[0].length) || exports.PLUS_CAL_DEFAULT_NAME;
        const symbol = new vscode.SymbolInformation(algName, vscode.SymbolKind.Namespace, exports.ROOT_CONTAINER_NAME, new vscode.Location(docUri, line.range.start));
        context.startPlusCal(symbol);
        return true;
    }
    tryExtractPlusCalEnd(line) {
        const matches = /(end\s+algorithm)(;)?\s*(\*\))/g.test(line.text);
        if (matches) {
            return SpecialSymbol.PlusCalEnd;
        }
        return line.text === '\\* BEGIN TRANSLATION' ? SpecialSymbol.PlusCalEnd : undefined;
    }
}
exports.TlaDocumentSymbolsProvider = TlaDocumentSymbolsProvider;
function isCommentStart(str) {
    return str.startsWith('\\*') || str.startsWith('(*');
}
/**
 * Finds and returns the last line of the definition block, started at the given line.
 * Definition block expands till the next non-empty line with no leading spaces.
 */
function findBlockDefinitionEnd(document, startLine, indent) {
    let lastLine = startLine;
    for (let i = startLine.lineNumber + 1; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        if (line.isEmptyOrWhitespace) {
            continue;
        }
        if (line.firstNonWhitespaceCharacterIndex <= indent) { // New block started
            break;
        }
        lastLine = line;
    }
    return lastLine;
}
//# sourceMappingURL=tlaSymbols.js.map