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
exports.splitArguments = exports.buildPlusCalOptions = exports.buildTlcOptions = exports.buildJavaOptions = exports.stopProcess = exports.runTlc = exports.runTex = exports.runSany = exports.runPlusCal = exports.JavaVersion = exports.ToolingError = exports.ToolProcessInfo = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const child_process_1 = require("child_process");
const common_1 = require("./common");
const javaVersion_1 = require("./parsers/javaVersion");
const tlcStatisticsCfg_1 = require("./commands/tlcStatisticsCfg");
const outputChannels_1 = require("./outputChannels");
const CFG_JAVA_HOME = 'tlaplus.java.home';
const CFG_JAVA_OPTIONS = 'tlaplus.java.options';
const CFG_TLC_OPTIONS = 'tlaplus.tlc.modelChecker.options';
const CFG_PLUSCAL_OPTIONS = 'tlaplus.pluscal.options';
const VAR_TLC_SPEC_NAME = /\$\{specName\}/g;
const VAR_TLC_MODEL_NAME = /\$\{modelName\}/g;
const NO_ERROR = 0;
const MIN_TLA_ERROR = 10; // Exit codes not related to tooling start from this number
const LOWEST_JAVA_VERSION = 8;
const DEFAULT_GC_OPTION = '-XX:+UseParallelGC';
const TLA_TOOLS_LIB_NAME = 'tla2tools.jar';
const TLA_TOOLS_LIB_NAME_END_UNIX = '/' + TLA_TOOLS_LIB_NAME;
const TLA_TOOLS_LIB_NAME_END_WIN = '\\' + TLA_TOOLS_LIB_NAME;
const toolsJarPath = path.resolve(__dirname, '../../tools/' + TLA_TOOLS_LIB_NAME);
const javaCmd = 'java' + (process.platform === 'win32' ? '.exe' : '');
const javaVersionChannel = new outputChannels_1.ToolOutputChannel('TLA+ Java version');
let lastUsedJavaHome;
let cachedJavaPath;
var TlaTool;
(function (TlaTool) {
    TlaTool["PLUS_CAL"] = "pcal.trans";
    TlaTool["SANY"] = "tla2sany.SANY";
    TlaTool["TLC"] = "tlc2.TLC";
    TlaTool["TEX"] = "tla2tex.TLA";
})(TlaTool || (TlaTool = {}));
class ToolProcessInfo {
    constructor(commandLine, process) {
        this.commandLine = commandLine;
        this.process = process;
    }
}
exports.ToolProcessInfo = ToolProcessInfo;
/**
 * Thrown when there's some problem with Java or TLA+ tooling.
 */
class ToolingError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.ToolingError = ToolingError;
class JavaVersion {
    constructor(version, fullOutput) {
        this.version = version;
        this.fullOutput = fullOutput;
    }
}
exports.JavaVersion = JavaVersion;
JavaVersion.UNKNOWN_VERSION = '?';
function runPlusCal(tlaFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const customOptions = getConfigOptions(CFG_PLUSCAL_OPTIONS);
        return runTool(TlaTool.PLUS_CAL, tlaFilePath, buildPlusCalOptions(tlaFilePath, customOptions), []);
    });
}
exports.runPlusCal = runPlusCal;
function runSany(tlaFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return runTool(TlaTool.SANY, tlaFilePath, [path.basename(tlaFilePath)], []);
    });
}
exports.runSany = runSany;
function runTex(tlaFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return runTool(TlaTool.TEX, tlaFilePath, [path.basename(tlaFilePath)], []);
    });
}
exports.runTex = runTex;
function runTlc(tlaFilePath, cfgFilePath) {
    return __awaiter(this, void 0, void 0, function* () {
        const customOptions = getConfigOptions(CFG_TLC_OPTIONS);
        const javaOptions = [];
        const shareStats = vscode.workspace.getConfiguration().get(tlcStatisticsCfg_1.CFG_TLC_STATISTICS_TYPE);
        if (shareStats !== tlcStatisticsCfg_1.ShareOption.DoNotShare) {
            javaOptions.push('-Dtlc2.TLC.ide=vscode');
        }
        return runTool(TlaTool.TLC, tlaFilePath, buildTlcOptions(tlaFilePath, cfgFilePath, customOptions), javaOptions);
    });
}
exports.runTlc = runTlc;
function runTool(toolName, filePath, toolOptions, javaOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        const javaPath = yield obtainJavaPath();
        const cfgOptions = getConfigOptions(CFG_JAVA_OPTIONS);
        const args = buildJavaOptions(cfgOptions, toolsJarPath).concat(javaOptions);
        args.push(toolName);
        toolOptions.forEach(opt => args.push(opt));
        const proc = child_process_1.spawn(javaPath, args, { cwd: path.dirname(filePath) });
        addReturnCodeHandler(proc, toolName);
        return new ToolProcessInfo(buildCommandLine(javaPath, args), proc);
    });
}
/**
 * Kills the given process.
 */
function stopProcess(p) {
    if (!p.killed) {
        p.kill('SIGINT');
    }
}
exports.stopProcess = stopProcess;
function obtainJavaPath() {
    return __awaiter(this, void 0, void 0, function* () {
        const javaHome = vscode.workspace.getConfiguration().get(CFG_JAVA_HOME);
        if (cachedJavaPath && javaHome === lastUsedJavaHome) {
            return cachedJavaPath;
        }
        const javaPath = buildJavaPath();
        cachedJavaPath = javaPath;
        lastUsedJavaHome = javaHome;
        yield checkJavaVersion(javaPath);
        return javaPath;
    });
}
/**
 * Builds path to the Java executable based on the configuration.
 */
function buildJavaPath() {
    let javaPath = javaCmd;
    const javaHome = vscode.workspace.getConfiguration().get(CFG_JAVA_HOME);
    if (javaHome) {
        const homeUri = common_1.pathToUri(javaHome);
        javaPath = homeUri.fsPath + path.sep + 'bin' + path.sep + javaCmd;
        if (!fs.existsSync(javaPath)) {
            throw new ToolingError('Java executable not found. Check the Java Home setting.');
        }
    }
    return javaPath;
}
/**
 * Builds an array of options to pass to Java process when running TLA tools.
 */
function buildJavaOptions(customOptions, defaultClassPath) {
    const opts = customOptions.slice(0);
    mergeClassPathOption(opts, defaultClassPath);
    mergeGCOption(opts, DEFAULT_GC_OPTION);
    return opts;
}
exports.buildJavaOptions = buildJavaOptions;
/**
 * Builds an array of options to pass to the TLC tool.
 */
function buildTlcOptions(tlaFilePath, cfgFilePath, customOptions) {
    const custOpts = customOptions.map((opt) => {
        return opt
            .replace(VAR_TLC_SPEC_NAME, path.basename(tlaFilePath, '.tla'))
            .replace(VAR_TLC_MODEL_NAME, path.basename(cfgFilePath, '.cfg'));
    });
    const opts = [path.basename(tlaFilePath), '-tool', '-modelcheck'];
    addValueOrDefault('-coverage', '1', custOpts, opts);
    addValueOrDefault('-config', cfgFilePath, custOpts, opts);
    return opts.concat(custOpts);
}
exports.buildTlcOptions = buildTlcOptions;
/**
 * Builds an array of options to pass to the PlusCal tool.
 */
function buildPlusCalOptions(tlaFilePath, customOptions) {
    const opts = customOptions.slice(0);
    opts.push(path.basename(tlaFilePath));
    return opts;
}
exports.buildPlusCalOptions = buildPlusCalOptions;
/**
 * Splits the given string into an array of command line arguments.
 */
function splitArguments(str) {
    const regEx = /(?:[^\s'"]+|"(?:\\.|[^"]|\s)*"|'(?:\\.|[^']|\s)*')/g;
    const matches = str.match(regEx);
    if (!matches) {
        return [];
    }
    return matches
        .map(opt => opt.trim())
        .filter(opt => opt !== '')
        .map(opt => removeQuotes(opt)); // This must not be put before throwing out empty strings
}
exports.splitArguments = splitArguments;
/**
 * Executes java -version and analyzes, if the version is 1.8 or higher.
 */
function checkJavaVersion(javaPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const proc = child_process_1.spawn(javaPath, ['-version']);
        const parser = new javaVersion_1.JavaVersionParser(proc.stderr);
        const ver = yield parser.readAll();
        if (ver.version === JavaVersion.UNKNOWN_VERSION) {
            ver.fullOutput.forEach(line => console.debug(line));
            throw new ToolingError('Error while obtaining Java version. Check the Java Home setting.');
        }
        const majVersion = extractMajor(ver.version);
        if (majVersion >= LOWEST_JAVA_VERSION) {
            return;
        }
        vscode.window.showWarningMessage(`Unsupported Java version: ${ver.version}`, 'Show Details').then(() => showJavaVersionOutput(javaPath, ver));
    });
}
function addValueOrDefault(option, defaultValue, args, realArgs) {
    realArgs.push(option);
    const idx = args.indexOf(option);
    if (idx < 0 || idx === args.length - 1) {
        realArgs.push(defaultValue);
    }
    else {
        realArgs.push(args[idx + 1]);
        args.splice(idx, 2);
    }
}
/**
 * Adds a handler to the given TLA+ tooling process that captures various system errors.
 */
function addReturnCodeHandler(proc, toolName) {
    var _a;
    const stderr = [];
    (_a = proc.stderr) === null || _a === void 0 ? void 0 : _a.on('data', chunk => {
        stderr.push(String(chunk));
    });
    proc.on('close', exitCode => {
        if (exitCode !== NO_ERROR && exitCode < MIN_TLA_ERROR) {
            const details = stderr.join('\n');
            vscode.window.showErrorMessage(`Error running ${toolName} (exit code ${exitCode})\n${details}`);
        }
    });
}
function getConfigOptions(cfgName) {
    const optsString = vscode.workspace.getConfiguration().get(cfgName) || '';
    return splitArguments(optsString);
}
function buildCommandLine(programName, args) {
    const line = [programName];
    args
        .map(arg => arg.indexOf(' ') >= 0 ? '"' + arg + '"' : arg)
        .forEach(arg => line.push(arg));
    return line.join(' ');
}
/**
 * Adds the default GC option if no custom one is provided.
 */
function mergeGCOption(options, defaultGC) {
    const gcOption = options.find(opt => opt.startsWith('-XX:+Use') && opt.endsWith('GC'));
    if (!gcOption) {
        options.push(defaultGC);
    }
}
/**
 * Searches for -cp or -classpath option and merges its value with the default classpath.
 * Custom libraries must be given precedence over default ones.
 */
function mergeClassPathOption(options, defaultClassPath) {
    let cpIdx = -1;
    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        if (option === '-cp' || option === '-classpath') {
            cpIdx = i + 1;
            break;
        }
    }
    if (cpIdx < 0 || cpIdx >= options.length) {
        // No custom classpath provided, use the default one
        options.push('-cp', defaultClassPath);
        return;
    }
    let classPath = options[cpIdx];
    if (containsTlaToolsLib(classPath)) {
        return;
    }
    if (classPath.length > 0) {
        classPath += path.delimiter;
    }
    classPath += defaultClassPath;
    options[cpIdx] = classPath;
}
function containsTlaToolsLib(classPath) {
    const paths = classPath.split(path.delimiter);
    for (const p of paths) {
        if (p === TLA_TOOLS_LIB_NAME
            || p.endsWith(TLA_TOOLS_LIB_NAME_END_UNIX)
            || p.endsWith(TLA_TOOLS_LIB_NAME_END_WIN)) {
            return true;
        }
    }
    return false;
}
/**
 * Extracts the "major" Java version: 1.6.80 => 6, 1.8.202 => 8, 9.0.7 => 9, 11.0.6 => 11 etc.
 * @param version The full version as reported by `java -version`.
 */
function extractMajor(version) {
    let majVer = version;
    if (majVer.startsWith('1.')) {
        majVer = majVer.substring(2);
    }
    const pIdx = majVer.indexOf('.');
    if (pIdx > 0) {
        majVer = majVer.substring(0, pIdx);
    }
    return parseInt(majVer, 10);
}
/**
 * Shows full Java version output in an Output channel.
 */
function showJavaVersionOutput(javaPath, ver) {
    javaVersionChannel.clear();
    javaVersionChannel.appendLine(`${javaPath} -version`);
    ver.fullOutput.forEach(line => javaVersionChannel.appendLine(line));
    javaVersionChannel.revealWindow();
}
/**
 * Trims quotes from the given string.
 */
function removeQuotes(str) {
    return str.length > 1 && (isQuoted(str, '"') || isQuoted(str, "'"))
        ? str.substring(1, str.length - 1)
        : str;
}
function isQuoted(str, q) {
    return str.startsWith(q) && str.endsWith(q);
}
//# sourceMappingURL=tla2tools.js.map