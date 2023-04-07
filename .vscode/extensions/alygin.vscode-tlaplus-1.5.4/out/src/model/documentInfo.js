"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlaDocumentInfos = exports.TlaDocumentInfo = exports.Module = void 0;
/**
 * Describes a module, which can be:
 * - real TLA+ module
 * - PlusCal algorithm
 * - .tla file contents that is outside of modules and pluscal algorithms
 */
class Module {
    constructor(name, symbols = [], range) {
        this.name = name;
        this.symbols = symbols;
        this.range = range;
    }
}
exports.Module = Module;
/**
 * Various information about a TLA document.
 */
class TlaDocumentInfo {
    constructor(rootModule = undefined, plusCal = undefined, modules = [], symbols = []) {
        this.rootModule = rootModule;
        this.plusCal = plusCal;
        this.modules = modules;
        this.symbols = symbols;
        this.plusCalSymbols = (plusCal === null || plusCal === void 0 ? void 0 : plusCal.symbols) || [];
    }
    isPlusCalAt(pos) {
        return this.plusCal && this.plusCal.range.contains(pos) ? true : false;
    }
}
exports.TlaDocumentInfo = TlaDocumentInfo;
class TlaDocumentInfos {
    constructor() {
        this.map = new Map();
    }
    get(uri) {
        let docInfo = this.map.get(uri);
        if (!docInfo) {
            docInfo = new TlaDocumentInfo();
            this.map.set(uri, docInfo);
        }
        return docInfo;
    }
    set(uri, docInfo) {
        this.map.set(uri, docInfo);
    }
}
exports.TlaDocumentInfos = TlaDocumentInfos;
//# sourceMappingURL=documentInfo.js.map