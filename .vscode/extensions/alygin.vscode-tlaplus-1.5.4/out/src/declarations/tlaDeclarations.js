"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlaDefinitionsProvider = exports.TlaDeclarationsProvider = void 0;
function symbolLocations(document, docInfo, position) {
    const range = document.getWordRangeAtPosition(position);
    if (!range) {
        return undefined;
    }
    const rawWord = document.lineAt(position.line).text.substring(range.start.character, range.end.character);
    const word = trimTicks(rawWord);
    const symbols = docInfo.isPlusCalAt(position)
        ? docInfo.symbols.concat(docInfo.plusCalSymbols)
        : docInfo.symbols;
    const locations = [];
    for (const symbol of symbols) {
        if (symbol.name === word && symbol.location.range.start.isBeforeOrEqual(range.start)) {
            locations.push(symbol.location);
        }
    }
    return locations;
}
class TlaDeclarationsProvider {
    constructor(docInfos) {
        this.docInfos = docInfos;
    }
    provideDeclaration(document, position, token) {
        const docInfo = this.docInfos.get(document.uri);
        return docInfo ? symbolLocations(document, docInfo, position) : undefined;
    }
}
exports.TlaDeclarationsProvider = TlaDeclarationsProvider;
class TlaDefinitionsProvider {
    constructor(docInfos) {
        this.docInfos = docInfos;
    }
    provideDefinition(document, position, token) {
        const docInfo = this.docInfos.get(document.uri);
        return docInfo ? symbolLocations(document, docInfo, position) : undefined;
    }
}
exports.TlaDefinitionsProvider = TlaDefinitionsProvider;
function trimTicks(str) {
    const tickIdx = str.indexOf("'");
    return tickIdx < 0 ? str : str.substring(0, tickIdx);
}
//# sourceMappingURL=tlaDeclarations.js.map