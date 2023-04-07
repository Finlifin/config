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
exports.exists = exports.listFiles = exports.readFile = exports.writeFile = exports.copyFile = exports.deleteDir = exports.mkDir = exports.createTempDirSync = exports.pathToModuleName = exports.parseDateTime = exports.replaceExtension = exports.pathToUri = exports.ParsingError = exports.emptyFunc = exports.LANG_TLAPLUS_CFG = exports.LANG_TLAPLUS = void 0;
const vscode = require("vscode");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const os_1 = require("os");
exports.LANG_TLAPLUS = 'tlaplus';
exports.LANG_TLAPLUS_CFG = 'tlaplus_cfg';
const MAX_TEMP_DIR_ATTEMPTS = 100;
const emptyFunc = function () {
    return undefined;
};
exports.emptyFunc = emptyFunc;
/**
 * Thrown when there's some problem with parsing.
 */
class ParsingError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.ParsingError = ParsingError;
function pathToUri(filePath) {
    return vscode.Uri.file(filePath).with({ scheme: 'file' });
}
exports.pathToUri = pathToUri;
function replaceExtension(filePath, newExt) {
    const lastDotIdx = filePath.lastIndexOf('.');
    const basePath = lastDotIdx < 0 ? filePath : filePath.substring(0, lastDotIdx);
    return `${basePath}.${newExt}`;
}
exports.replaceExtension = replaceExtension;
function parseDateTime(str) {
    const dateTime = moment(str, moment.ISO_8601, true);
    if (dateTime.isValid()) {
        return dateTime;
    }
    throw new ParsingError(`Cannot parse date/time ${str}`);
}
exports.parseDateTime = parseDateTime;
function pathToModuleName(filePath) {
    // It's necessary to check both separators here, not just `path.sep`
    // to support .out files portability. TLA+ doesn't support slashes in module names,
    // so it breaks nothing.
    // path.basename() doesn't work in some cases
    const sid = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return filePath.substring(sid + 1, filePath.length - 4); // remove path and .tla
}
exports.pathToModuleName = pathToModuleName;
function createTempDirSync() {
    const baseDir = os_1.tmpdir();
    for (let i = 0; i < MAX_TEMP_DIR_ATTEMPTS; i++) {
        const timestamp = new Date().getTime();
        const tempDir = `${baseDir}${path.sep}vscode-tlaplus-${timestamp}`;
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
            return tempDir;
        }
    }
    vscode.window.showErrorMessage(`Cannot create temporary directory inside ${baseDir}.`);
    return undefined;
}
exports.createTempDirSync = createTempDirSync;
function mkDir(dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.mkdir(dirPath, null, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    });
}
exports.mkDir = mkDir;
function deleteDir(dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const fileName of fs.readdirSync(dirPath)) {
            const filePath = path.join(dirPath, fileName);
            try {
                const fileInfo = yield getFileInfo(filePath);
                if (fileInfo.isDirectory()) {
                    yield deleteDir(filePath);
                }
                else {
                    yield deleteFile(filePath);
                }
            }
            catch (err) {
                console.error(`Cannot delete file ${filePath}: ${err}`);
            }
        }
        fs.rmdir(dirPath, (err) => {
            if (err) {
                console.error(`Cannot delete directory ${dirPath}: ${err}`);
            }
        });
    });
}
exports.deleteDir = deleteDir;
function deleteFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.unlink(filePath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(undefined);
            });
        });
    });
}
function getFileInfo(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.lstat(filePath, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stats);
            });
        });
    });
}
function copyFile(filePath, destDir) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const fileName = path.basename(filePath);
            fs.copyFile(filePath, path.join(destDir, fileName), (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(undefined);
            });
        });
    });
}
exports.copyFile = copyFile;
function writeFile(filePath, ...contents) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, contents.join('\n'), (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(true);
                }
            });
        });
    });
}
exports.writeFile = writeFile;
function readFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, { encoding: 'UTF-8' }, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    });
}
exports.readFile = readFile;
function listFiles(dirPath, predicate) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            fs.readdir(dirPath, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                const result = predicate ? files.filter(predicate) : files;
                resolve(result);
            });
        });
    });
}
exports.listFiles = listFiles;
function exists(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            fs.exists(filePath, (ex) => resolve(ex));
        });
    });
}
exports.exists = exists;
//# sourceMappingURL=common.js.map