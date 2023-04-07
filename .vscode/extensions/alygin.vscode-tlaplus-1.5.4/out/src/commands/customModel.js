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
exports.createCustomModel = exports.CustomModelInfo = void 0;
const vscode = require("vscode");
const path = require("path");
const common_1 = require("../common");
class CustomModelInfo {
    constructor(dirPath, tlaFileName, cfgFileName) {
        this.dirPath = dirPath;
        this.tlaFileName = tlaFileName;
        this.cfgFileName = cfgFileName;
    }
}
exports.CustomModelInfo = CustomModelInfo;
/**
 * Creates custom specification and model config for a specific check run.
 * Such models are treated as temporary, they deleted after checking.
 * @param baseSpec .tla file that must be used as a base specification for the custom model.
 */
function createCustomModel(baseSpec, tlaContents, cfgContents) {
    return __awaiter(this, void 0, void 0, function* () {
        const tempDir = common_1.createTempDirSync();
        if (!tempDir) {
            return undefined;
        }
        const copied = yield copySpecFiles(path.dirname(baseSpec), tempDir);
        if (!copied) {
            return undefined;
        }
        const rootModule = 't' + (new Date().getTime());
        const baseModuleFile = path.basename(baseSpec);
        const baseModule = baseModuleFile.substring(0, baseModuleFile.length - 4);
        const rootModuleFileName = rootModule + '.tla';
        const tlaCreated = yield createFile(path.join(tempDir, rootModuleFileName), `---- MODULE ${rootModule} ----`, `EXTENDS ${baseModule}, TLC`, ...tlaContents, '====');
        if (!tlaCreated) {
            return undefined;
        }
        const cfgFileName = rootModule + '.cfg';
        const cfgCreated = yield createFile(path.join(tempDir, cfgFileName), ...cfgContents);
        if (!cfgCreated) {
            return undefined;
        }
        return new CustomModelInfo(tempDir, rootModuleFileName, cfgFileName);
    });
}
exports.createCustomModel = createCustomModel;
function copySpecFiles(srcDir, destDir) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fileNames = yield common_1.listFiles(srcDir, (fName) => fName.endsWith('.tla'));
            for (const fName of fileNames) {
                yield common_1.copyFile(path.join(srcDir, fName), destDir);
            }
            return true;
        }
        catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(`Cannot copy spec and model files: ${err}`);
        }
        return false;
    });
}
function createFile(filePath, ...contents) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield common_1.writeFile(filePath, ...contents);
            return true;
        }
        catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(`Cannot create file ${filePath}: ${err}`);
        }
        return false;
    });
}
//# sourceMappingURL=customModel.js.map