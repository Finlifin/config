"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TlcModelCheckerStdoutParser = void 0;
const vscode_1 = require("vscode");
const moment = require("moment/moment");
const timers_1 = require("timers");
const check_1 = require("../model/check");
const outputHandler_1 = require("../outputHandler");
const tlcValues_1 = require("./tlcValues");
const sany_1 = require("./sany");
const diagnostic_1 = require("../diagnostic");
const common_1 = require("../common");
const msg = require("./tlcCodes");
const tlcCodes_1 = require("./tlcCodes");
const STATUS_EMIT_TIMEOUT = 500; // msec
// TLC message severity from
// https://github.com/tlaplus/tlaplus/blob/2f229f1d3e5ed1e2eadeff3bcd877b416e45d477/tlatools/src/tlc2/output/MP.java
const SEVERITY_ERROR = 1;
const SEVERITY_TLC_BUG = 2;
const SEVERITY_WARNING = 3;
/**
 * Parses stdout of TLC model checker.
 */
class TlcModelCheckerStdoutParser extends outputHandler_1.ProcessOutputHandler {
    constructor(source, stdout, specFiles, showFullOutput, handler) {
        super(stdout, new diagnostic_1.DCollection());
        this.handler = handler;
        this.timer = undefined;
        this.first = true;
        this.handler = handler;
        this.checkResultBuilder = new ModelCheckResultBuilder(source, specFiles, showFullOutput);
        if (specFiles) {
            this.result.addFilePath(specFiles.tlaFilePath);
        }
    }
    handleLine(line) {
        if (line !== null) {
            this.checkResultBuilder.addLine(line);
            this.scheduleUpdate();
        }
        else {
            this.checkResultBuilder.handleStop();
            // Copy SANY messages
            const dCol = this.checkResultBuilder.getSanyMessages();
            if (dCol) {
                diagnostic_1.addDiagnostics(dCol, this.result);
            }
            // Issue the last update
            this.issueUpdate();
        }
    }
    scheduleUpdate() {
        if (this.timer) {
            return;
        }
        let timeout = STATUS_EMIT_TIMEOUT;
        if (this.first && this.checkResultBuilder.getStatus() !== check_1.CheckStatus.NotStarted) {
            // First status change, show immediately
            this.first = false;
            timeout = 0;
        }
        this.timer = setTimeout(() => {
            this.issueUpdate();
        }, timeout);
    }
    issueUpdate() {
        if (this.timer) {
            timers_1.clearTimeout(this.timer);
        }
        this.handler(this.checkResultBuilder.build());
        this.timer = undefined;
    }
}
exports.TlcModelCheckerStdoutParser = TlcModelCheckerStdoutParser;
class LineParsingResult {
    constructor(success, remainingLine) {
        this.success = success;
        this.remainingLine = remainingLine;
    }
}
/**
 * Represents a message type, parsed from its header.
 * 1000   -> { 1000, undefined }
 * 1000:1 -> { 1000, Error }
 * 3044:3 -> { 3044, Warning }
 * etc.
 */
class MessageType {
    constructor(code, forcedType) {
        this.code = code;
        this.forcedType = forcedType;
    }
    isUnknown() {
        return this.code === MessageType.Unknown.code;
    }
}
MessageType.Unknown = new MessageType(-1938477103983); // Some constant that is not used as a TLC code
/**
 * TLC output message.
 */
class Message {
    constructor(type) {
        this.type = type;
        this.lines = [];
    }
}
/**
 * Tracks hierarchy of TLC output messages.
 */
class MessageStack {
    constructor() {
        this.current = MessageStack.NO_MESSAGE;
        this.previous = [];
    }
    getCurrentType() {
        return this.current.type;
    }
    start(type) {
        if (type.isUnknown()) {
            throw Error('Cannot start message of unknown type');
        }
        this.previous.push(this.current);
        this.current = new Message(type);
    }
    finish() {
        if (this.current.type.isUnknown()) {
            vscode_1.window.showErrorMessage('Unexpected message end');
            console.error('Unexpected message end');
            return MessageStack.NO_MESSAGE;
        }
        const finished = this.current;
        this.current = this.previous.pop() || MessageStack.NO_MESSAGE;
        return finished;
    }
    addLine(line) {
        if (this.current.type.isUnknown()) {
            console.error("Unexpected line when there's no current message");
            return;
        }
        this.current.lines.push(line);
    }
}
MessageStack.NO_MESSAGE = new Message(MessageType.Unknown);
/**
 * Gradually builds ModelCheckResult by processing TLC output lines.
 */
class ModelCheckResultBuilder {
    constructor(source, specFiles, showFullOutput) {
        this.source = source;
        this.specFiles = specFiles;
        this.showFullOutput = showFullOutput;
        this.state = check_1.CheckState.Running;
        this.status = check_1.CheckStatus.NotStarted;
        this.initialStatesStat = [];
        this.coverageStat = [];
        this.warnings = [];
        this.errors = [];
        this.messages = new MessageStack();
        this.sanyLines = [];
        this.outputLines = [];
        this.workersCount = 0;
    }
    getStatus() {
        return this.status;
    }
    getSanyMessages() {
        return this.sanyData ? this.sanyData.dCollection : undefined;
    }
    addLine(line) {
        const endRes = this.tryParseMessageEnd(line);
        let eLine = line;
        if (endRes.success) {
            const message = this.messages.finish();
            this.handleMessageEnd(message);
            eLine = endRes.remainingLine;
        }
        const newMsgType = this.tryParseMessageStart(eLine);
        if (newMsgType) {
            this.messages.start(newMsgType);
            return;
        }
        if (eLine === '') {
            return;
        }
        if (this.status === check_1.CheckStatus.SanyParsing) {
            this.sanyLines.push(eLine);
            return;
        }
        if (!this.messages.getCurrentType().isUnknown()) {
            this.messages.addLine(eLine);
            return;
        }
        this.addOutputLine(eLine);
    }
    handleStop() {
        if (this.status !== check_1.CheckStatus.Finished) {
            // The process wasn't finished as expected, hence it was stopped manually
            this.state = check_1.CheckState.Stopped;
        }
    }
    build() {
        return new check_1.ModelCheckResult(this.source, this.specFiles, this.showFullOutput, this.state, this.status, this.processInfo, this.initialStatesStat, this.coverageStat, this.warnings, this.errors, this.sanyData ? this.sanyData.dCollection : undefined, this.startDateTime, this.endDateTime, this.duration, this.workersCount, this.fingerprintCollisionProbability, this.outputLines);
    }
    handleMessageEnd(message) {
        if (this.status === check_1.CheckStatus.NotStarted) {
            this.status = check_1.CheckStatus.Starting;
        }
        const tlcCode = tlcCodes_1.getTlcCode(message.type.code);
        if (!tlcCode) {
            vscode_1.window.showErrorMessage(`Unexpected message code: ${message.type.code}`);
            return;
        }
        if (tlcCode.type === tlcCodes_1.TlcCodeType.Ignore) {
            // Ignoring has precedence over forced type, otherwise there will bee to much noise
            // in the Error section
            return;
        }
        const effectiveType = message.type.forcedType ? message.type.forcedType : tlcCode.type;
        if (effectiveType === tlcCodes_1.TlcCodeType.Warning) {
            this.parseWarningMessage(message.lines);
            return;
        }
        if (effectiveType === tlcCodes_1.TlcCodeType.Error) {
            this.parseErrorMessage(message.lines);
            return;
        }
        switch (tlcCode) {
            case msg.TLC_MODE_MC:
                this.processInfo = message.lines.join('');
                break;
            case msg.TLC_SANY_START:
                this.status = check_1.CheckStatus.SanyParsing;
                break;
            case msg.TLC_SANY_END:
                this.status = check_1.CheckStatus.SanyFinished;
                this.parseSanyOutput();
                break;
            case msg.TLC_CHECKPOINT_START:
                this.status = check_1.CheckStatus.Checkpointing;
                break;
            case msg.TLC_STARTING:
                this.parseStarting(message.lines);
                break;
            case msg.TLC_COMPUTING_INIT:
                this.status = check_1.CheckStatus.InitialStatesComputing;
                break;
            case msg.TLC_COMPUTING_INIT_PROGRESS:
                this.status = check_1.CheckStatus.InitialStatesComputing;
                break;
            case msg.TLC_INIT_GENERATED1:
            case msg.TLC_INIT_GENERATED2:
            case msg.TLC_INIT_GENERATED3:
            case msg.TLC_INIT_GENERATED4:
                this.parseInitialStatesComputed(message.lines);
                break;
            case msg.TLC_CHECKING_TEMPORAL_PROPS:
                if (message.lines.length > 0 && message.lines[0].indexOf('complete') >= 0) {
                    this.status = check_1.CheckStatus.CheckingLivenessFinal;
                }
                else {
                    this.status = check_1.CheckStatus.CheckingLiveness;
                }
                break;
            case msg.TLC_DISTRIBUTED_SERVER_RUNNING:
                this.status = check_1.CheckStatus.ServerRunning;
                break;
            case msg.TLC_DISTRIBUTED_WORKER_REGISTERED:
                this.status = check_1.CheckStatus.WorkersRegistered;
                this.workersCount += 1;
                break;
            case msg.TLC_DISTRIBUTED_WORKER_DEREGISTERED:
                this.workersCount -= 1;
                break;
            case msg.TLC_PROGRESS_STATS:
                this.parseProgressStats(message.lines);
                break;
            case msg.TLC_COVERAGE_INIT:
                this.coverageStat.length = 0;
                this.parseCoverage(message.lines);
                break;
            case msg.TLC_COVERAGE_NEXT:
                this.parseCoverage(message.lines);
                break;
            case msg.TLC_STATE_PRINT1:
            case msg.TLC_STATE_PRINT2:
            case msg.TLC_STATE_PRINT3:
            case msg.TLC_BACK_TO_STATE:
                this.parseErrorTraceItem(message.lines);
                break;
            case msg.GENERAL:
            case msg.TLC_MODULE_OVERRIDE_STDOUT:
                message.lines.forEach((line) => this.addOutputLine(line));
                break;
            case msg.TLC_SUCCESS:
                this.parseSuccess(message.lines);
                this.state = this.errors.length === 0
                    ? check_1.CheckState.Success
                    : check_1.CheckState.Error; // There might be error messages if the -continue option was used
                break;
            case msg.TLC_FINISHED:
                this.status = check_1.CheckStatus.Finished;
                this.parseFinished(message.lines);
                if (this.state !== check_1.CheckState.Success) {
                    this.state = check_1.CheckState.Error;
                }
                break;
            default:
                vscode_1.window.showErrorMessage(`No handler for message of type ${message.type}`);
                console.error(`No handler for message of type ${message.type}, text: ${message.lines.join('\n')}`);
        }
    }
    tryParseMessageStart(line) {
        const matches = /^(.*)@!@!@STARTMSG (-?\d+)(:\d+)? @!@!@$/g.exec(line);
        if (!matches) {
            return undefined;
        }
        if (matches[1] !== '') {
            this.messages.addLine(matches[1]);
        }
        const code = parseInt(matches[2]);
        let forcedType;
        if (matches[3] !== '') {
            const severity = parseInt(matches[3].substring(1));
            if (severity === SEVERITY_ERROR || severity === SEVERITY_TLC_BUG) {
                forcedType = tlcCodes_1.TlcCodeType.Error;
            }
            else if (severity === SEVERITY_WARNING) {
                forcedType = tlcCodes_1.TlcCodeType.Warning;
            }
        }
        return new MessageType(code, forcedType);
    }
    tryParseMessageEnd(line) {
        const matches = /^(.*)@!@!@ENDMSG -?\d+ @!@!@(.*)$/g.exec(line);
        if (!matches) {
            return new LineParsingResult(false, line);
        }
        if (matches[1] !== '') {
            this.messages.addLine(matches[1]);
        }
        return new LineParsingResult(true, matches[2]);
    }
    parseStarting(lines) {
        const matches = this.tryMatchBufferLine(lines, /^Starting\.\.\. \((\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\)$/g);
        if (matches) {
            this.startDateTime = common_1.parseDateTime(matches[1]);
        }
    }
    parseSuccess(lines) {
        const matches = this.tryMatchBufferLine(lines, /calculated \(optimistic\):\s+val = (.+)$/g, 3);
        if (matches) {
            this.fingerprintCollisionProbability = matches[1];
        }
    }
    parseFinished(lines) {
        const regex = /^Finished in (\d+)ms at \((\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\)$/g;
        const matches = this.tryMatchBufferLine(lines, regex);
        if (matches) {
            this.duration = parseInt(matches[1]);
            this.endDateTime = common_1.parseDateTime(matches[2]);
        }
    }
    parseSanyOutput() {
        const sany = new sany_1.SanyStdoutParser(this.sanyLines);
        this.sanyData = sany.readAllSync();
        // Display SANY error messages as model checking errors
        this.sanyData.dCollection.getMessages().forEach(diag => {
            const message = check_1.MessageLine.fromText(diag.diagnostic.message);
            if (diag.diagnostic.severity === vscode_1.DiagnosticSeverity.Warning) {
                this.warnings.push(new check_1.WarningInfo([message]));
            }
            else {
                this.errors.push(new check_1.ErrorInfo([message], []));
            }
        });
    }
    parseInitialStatesComputed(lines) {
        // eslint-disable-next-line max-len
        const regex = /^Finished computing initial states: (\d+) distinct state(s)? generated at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}).*$/g;
        const matches = this.tryMatchBufferLine(lines, regex);
        if (matches) {
            const count = parseInt(matches[1]);
            this.firstStatTime = common_1.parseDateTime(matches[3]);
            this.initialStatesStat.push(new check_1.InitialStateStatItem('00:00:00', 0, count, count, count));
        }
    }
    parseProgressStats(lines) {
        // eslint-disable-next-line max-len
        const regex = /^Progress\(([\d,]+)\) at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}): ([\d,]+) states generated.*, ([\d,]+) distinct states found.*, ([\d,]+) states left on queue.*/g;
        const matches = this.tryMatchBufferLine(lines, regex);
        if (matches) {
            const item = new check_1.InitialStateStatItem(this.calcTimestamp(matches[2]), parseIntWithComma(matches[1]), parseIntWithComma(matches[3]), parseIntWithComma(matches[4]), parseIntWithComma(matches[5]));
            if (this.initialStatesStat.length > 0
                && this.initialStatesStat[this.initialStatesStat.length - 1].timeStamp === item.timeStamp) {
                this.initialStatesStat[this.initialStatesStat.length - 1] = item;
            }
            else {
                this.initialStatesStat.push(item);
            }
        }
    }
    parseCoverage(lines) {
        const regex = /^<(\w+) line (\d+), col (\d+) to line (\d+), col (\d+) of module (\w+)>: (\d+):(\d+)/g;
        const matches = this.tryMatchBufferLine(lines, regex);
        if (matches) {
            const moduleName = matches[6];
            const actionName = matches[1];
            this.coverageStat.push(new check_1.CoverageItem(moduleName, actionName, this.getModulePath(moduleName), new vscode_1.Range(parseInt(matches[2]) - 1, parseInt(matches[3]) - 1, parseInt(matches[4]) - 1, parseInt(matches[5])), parseInt(matches[8]), parseInt(matches[7])));
        }
    }
    parseWarningMessage(lines) {
        if (lines.length === 0) {
            return;
        }
        const msgLines = lines.map((l) => this.makeMessageLine(l));
        this.warnings.push(new check_1.WarningInfo(msgLines));
    }
    parseErrorMessage(lines) {
        if (lines.length === 0) {
            return;
        }
        const msgLines = lines.map((l) => this.makeMessageLine(l));
        if (lines[0] === 'TLC threw an unexpected exception.' && this.errors.length > 0) {
            // Such message must be combined with the previous one (that was actually nested)
            const prevError = this.errors[this.errors.length - 1];
            prevError.lines = msgLines.concat(prevError.lines);
            return;
        }
        this.errors.push(new check_1.ErrorInfo(msgLines, []));
    }
    parseErrorTraceItem(lines) {
        if (lines.length === 0) {
            console.log('Error trace expected but message buffer is empty');
            return;
        }
        let traceItem = this.tryParseSimpleErrorTraceItem(lines);
        const checkChanges = traceItem instanceof check_1.ErrorTraceItem;
        if (!traceItem) {
            traceItem = this.tryParseSpecialErrorTraceItem(lines);
        }
        if (!traceItem) {
            traceItem = this.tryParseBackToStateErrorTraceItem(lines);
        }
        if (!traceItem) {
            console.error(`Cannot parse error trace item: ${lines[0]}`);
            const itemVars = this.parseErrorTraceVariables(lines);
            traceItem = new check_1.ErrorTraceItem(0, lines[1], '', '', undefined, new vscode_1.Range(0, 0, 0, 0), itemVars);
        }
        if (this.errors.length === 0) {
            this.errors.push(new check_1.ErrorInfo([this.makeMessageLine('[Unknown error]')], []));
        }
        const lastError = this.errors[this.errors.length - 1];
        if (checkChanges) {
            check_1.findChanges(lastError.errorTrace[lastError.errorTrace.length - 1].variables, traceItem.variables);
        }
        lastError.errorTrace.push(traceItem);
    }
    tryParseSimpleErrorTraceItem(lines) {
        const regex = /^(\d+): <(\w+) line (\d+), col (\d+) to line (\d+), col (\d+) of module (\w+)>$/g;
        const matches = this.tryMatchBufferLine(lines, regex);
        if (!matches) {
            return undefined;
        }
        const itemVars = this.parseErrorTraceVariables(lines);
        const actionName = matches[2];
        const moduleName = matches[7];
        return new check_1.ErrorTraceItem(parseInt(matches[1]), `${actionName} in ${moduleName}`, moduleName, actionName, this.getModulePath(moduleName), new vscode_1.Range(parseInt(matches[3]) - 1, parseInt(matches[4]) - 1, parseInt(matches[5]) - 1, parseInt(matches[6])), itemVars);
    }
    tryParseSpecialErrorTraceItem(lines) {
        // Try special cases like "Initial predicate", "Stuttering", etc.
        const matches = this.tryMatchBufferLine(lines, /^(\d+): <?([\w\s]+)>?$/g);
        if (!matches) {
            return undefined;
        }
        const itemVars = this.parseErrorTraceVariables(lines);
        return new check_1.ErrorTraceItem(parseInt(matches[1]), matches[2], '', '', undefined, new vscode_1.Range(0, 0, 0, 0), itemVars);
    }
    tryParseBackToStateErrorTraceItem(lines) {
        // Try special cases "Back to state: <...>"
        const regex = /^(\d+): Back to state: <(\w+) line (\d+), col (\d+) to line (\d+), col (\d+) of module (\w+)>?/g;
        const matches = this.tryMatchBufferLine(lines, regex);
        if (!matches) {
            return undefined;
        }
        const itemVars = this.parseErrorTraceVariables(lines);
        const actionName = matches[2];
        const moduleName = matches[7];
        const num = parseInt(matches[1]) + 1; // looks like a shift-by-one error in the Toolbox
        return new check_1.ErrorTraceItem(num, 'Back to state', moduleName, actionName, this.getModulePath(moduleName), new vscode_1.Range(parseInt(matches[3]) - 1, parseInt(matches[4]) - 1, parseInt(matches[5]) - 1, parseInt(matches[6])), itemVars);
    }
    parseErrorTraceVariables(lines) {
        const variables = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const matches = /^(?:\/\\ )?(\w+) = (.+)$/g.exec(line);
            if (matches) {
                const name = matches[1];
                const valueLines = [matches[2]];
                this.readValueLines(i + 1, lines, valueLines);
                i += valueLines.length - 1;
                const value = tlcValues_1.parseVariableValue(name, valueLines);
                variables.push(value);
            }
        }
        return new check_1.StructureValue('', variables);
    }
    readValueLines(startIdx, lines, valueLines) {
        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('/\\ ')) {
                return;
            }
            valueLines.push(line.trim());
        }
    }
    tryMatchBufferLine(lines, regExp, n) {
        const en = n ? n : 0;
        if (lines.length < en + 1) {
            return null;
        }
        return regExp.exec(lines[en]);
    }
    calcTimestamp(timeStr) {
        if (!this.firstStatTime) {
            return '00:00:00';
        }
        const time = common_1.parseDateTime(timeStr);
        const durMsec = time.diff(this.firstStatTime);
        const dur = moment.duration(durMsec);
        const sec = leftPadTimeUnit(dur.seconds());
        const min = leftPadTimeUnit(dur.minutes());
        const hour = leftPadTimeUnit(Math.floor(dur.asHours())); // days are converted to hours
        return `${hour}:${min}:${sec}`;
    }
    addOutputLine(line) {
        const prevLine = this.outputLines.length > 0 ? this.outputLines[this.outputLines.length - 1] : undefined;
        if (prevLine && prevLine.text === line) {
            prevLine.increment();
        }
        else {
            this.outputLines.push(new check_1.OutputLine(line));
        }
    }
    getModulePath(moduleName) {
        return this.sanyData ? this.sanyData.modulePaths.get(moduleName) : undefined;
    }
    makeMessageLine(line) {
        const matches = /^(.*)\b((?:L|l)ine (\d+), column (\d+) to line \d+, column \d+ in (\w+))\b(.*)$/g.exec(line);
        const modulePath = matches ? this.getModulePath(matches[5]) : undefined;
        if (!matches || !modulePath) {
            return check_1.MessageLine.fromText(line);
        }
        const spans = [];
        if (matches[1] !== '') {
            spans.push(check_1.MessageSpan.newTextSpan(matches[1]));
        }
        spans.push(check_1.MessageSpan.newSourceLinkSpan(matches[2], modulePath, new vscode_1.Position(parseInt(matches[3]) - 1, parseInt(matches[4]) - 1)));
        if (matches[6] !== '') {
            spans.push(check_1.MessageSpan.newTextSpan(matches[6]));
        }
        return new check_1.MessageLine(spans);
    }
}
function parseIntWithComma(str) {
    const c = str.split(',').join('');
    return parseInt(c);
}
function leftPadTimeUnit(n) {
    return n < 10 ? '0' + n : String(n);
}
//# sourceMappingURL=tlc.js.map