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
exports.syncTlcStatisticsSetting = exports.listenTlcStatConfigurationChanges = exports.ShareOption = exports.CFG_TLC_STATISTICS_TYPE = void 0;
const vscode = require("vscode");
const path = require("path");
const os_1 = require("os");
const common_1 = require("../common");
exports.CFG_TLC_STATISTICS_TYPE = 'tlaplus.tlc.statisticsSharing';
const STAT_SETTINGS_DIR = '.tlaplus';
const STAT_SETTINGS_FILE = 'esc.txt';
const STAT_OPT_SHARE_NO_ID = 'RANDOM_IDENTIFIER';
const STAT_OPT_DO_NOT_SHARE = 'NO_STATISTICS';
var ShareOption;
(function (ShareOption) {
    ShareOption["Share"] = "share";
    ShareOption["ShareWithoutId"] = "shareWithoutId";
    ShareOption["DoNotShare"] = "doNotShare";
})(ShareOption = exports.ShareOption || (exports.ShareOption = {}));
/**
 * Writes TLC statistics sharing cfg file when the corresponding configuration setting is changed.
 */
function listenTlcStatConfigurationChanges(disposables) {
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(exports.CFG_TLC_STATISTICS_TYPE)) {
            const cfgOption = vscode.workspace.getConfiguration().get(exports.CFG_TLC_STATISTICS_TYPE);
            if (cfgOption) {
                writeFileOption(cfgOption);
            }
        }
    }, undefined, disposables);
}
exports.listenTlcStatConfigurationChanges = listenTlcStatConfigurationChanges;
/**
 * Updates the TLC statistics sharing setting in accordance with the config file if necessary.
 */
function syncTlcStatisticsSetting() {
    return __awaiter(this, void 0, void 0, function* () {
        const cfgOption = vscode.workspace.getConfiguration().get(exports.CFG_TLC_STATISTICS_TYPE);
        const fileOption = yield readFileOption();
        if (cfgOption === fileOption) {
            return Promise.reject();
        }
        const target = vscode.ConfigurationTarget.Global;
        return vscode.workspace.getConfiguration().update(exports.CFG_TLC_STATISTICS_TYPE, fileOption, target);
    });
}
exports.syncTlcStatisticsSetting = syncTlcStatisticsSetting;
function readFileOption() {
    return __awaiter(this, void 0, void 0, function* () {
        const file = path.join(os_1.homedir(), STAT_SETTINGS_DIR, STAT_SETTINGS_FILE);
        if (!(yield common_1.exists(file))) {
            return ShareOption.DoNotShare;
        }
        const fileContents = yield common_1.readFile(file);
        if (fileContents.startsWith(STAT_OPT_DO_NOT_SHARE)) {
            return ShareOption.DoNotShare;
        }
        else if (fileContents.startsWith(STAT_OPT_SHARE_NO_ID)) {
            return ShareOption.ShareWithoutId;
        }
        else if (fileContents.length > 0) {
            return ShareOption.Share;
        }
        return ShareOption.DoNotShare;
    });
}
function writeFileOption(option) {
    return __awaiter(this, void 0, void 0, function* () {
        let contents;
        switch (option) {
            case ShareOption.Share:
                contents = generateRandomInstallationId();
                break;
            case ShareOption.ShareWithoutId:
                contents = STAT_OPT_SHARE_NO_ID;
                break;
            case ShareOption.DoNotShare:
                contents = STAT_OPT_DO_NOT_SHARE;
                break;
            default:
                console.error(`Unsupported TLC statistics option: ${option}`);
                return Promise.reject();
        }
        const dir = path.join(os_1.homedir(), STAT_SETTINGS_DIR);
        const file = path.join(dir, STAT_SETTINGS_FILE);
        if (!(yield common_1.exists(dir))) {
            yield common_1.mkDir(dir);
        }
        return common_1.writeFile(file, contents + '\n');
    });
}
function generateRandomInstallationId() {
    const id = [];
    for (let i = 0; i < 32; i++) {
        const n = i % 2;
        id.push((n ^ Math.random() * 16 >> n / 4).toString(16));
    }
    return id.join('');
}
//# sourceMappingURL=tlcStatisticsCfg.js.map