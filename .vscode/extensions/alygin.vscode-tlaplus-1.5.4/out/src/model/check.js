"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findChanges = exports.getStatusName = exports.ModelCheckResult = exports.SpecFiles = exports.ModelCheckResultSource = exports.ErrorInfo = exports.WarningInfo = exports.OutputLine = exports.ErrorTraceItem = exports.SimpleFunction = exports.SimpleFunctionItem = exports.StructureValue = exports.SequenceValue = exports.SetValue = exports.CollectionValue = exports.NameValue = exports.Value = exports.Change = exports.MessageLine = exports.MessageSpan = exports.CoverageItem = exports.InitialStateStatItem = exports.CheckStatus = exports.CheckState = void 0;
const path = require("path");
const util_1 = require("util");
var CheckState;
(function (CheckState) {
    CheckState["Running"] = "R";
    CheckState["Success"] = "S";
    CheckState["Error"] = "E";
    CheckState["Stopped"] = "X";
})(CheckState = exports.CheckState || (exports.CheckState = {}));
var CheckStatus;
(function (CheckStatus) {
    CheckStatus[CheckStatus["NotStarted"] = 0] = "NotStarted";
    CheckStatus[CheckStatus["Starting"] = 1] = "Starting";
    CheckStatus[CheckStatus["SanyParsing"] = 2] = "SanyParsing";
    CheckStatus[CheckStatus["SanyFinished"] = 3] = "SanyFinished";
    CheckStatus[CheckStatus["InitialStatesComputing"] = 4] = "InitialStatesComputing";
    CheckStatus[CheckStatus["Checkpointing"] = 5] = "Checkpointing";
    CheckStatus[CheckStatus["CheckingLiveness"] = 6] = "CheckingLiveness";
    CheckStatus[CheckStatus["CheckingLivenessFinal"] = 7] = "CheckingLivenessFinal";
    CheckStatus[CheckStatus["ServerRunning"] = 8] = "ServerRunning";
    CheckStatus[CheckStatus["WorkersRegistered"] = 9] = "WorkersRegistered";
    CheckStatus[CheckStatus["Finished"] = 10] = "Finished";
})(CheckStatus = exports.CheckStatus || (exports.CheckStatus = {}));
const STATUS_NAMES = new Map();
STATUS_NAMES.set(CheckStatus.NotStarted, 'Not started');
STATUS_NAMES.set(CheckStatus.Starting, 'Starting');
STATUS_NAMES.set(CheckStatus.SanyParsing, 'SANY parsing');
STATUS_NAMES.set(CheckStatus.SanyFinished, 'SANY finished');
STATUS_NAMES.set(CheckStatus.InitialStatesComputing, 'Computing initial states');
STATUS_NAMES.set(CheckStatus.Checkpointing, 'Checkpointing');
STATUS_NAMES.set(CheckStatus.CheckingLiveness, 'Checking liveness');
STATUS_NAMES.set(CheckStatus.CheckingLivenessFinal, 'Checking final liveness');
STATUS_NAMES.set(CheckStatus.ServerRunning, 'Master waiting for workers');
STATUS_NAMES.set(CheckStatus.WorkersRegistered, 'Workers connected');
STATUS_NAMES.set(CheckStatus.Finished, 'Finished');
const STATE_NAMES = new Map();
STATE_NAMES.set(CheckState.Running, 'Running');
STATE_NAMES.set(CheckState.Success, 'Success');
STATE_NAMES.set(CheckState.Error, 'Errors');
STATE_NAMES.set(CheckState.Stopped, 'Stopped');
const VALUE_FORMAT_LENGTH_THRESHOLD = 30;
/**
 * Statistics on initial state generation.
 */
class InitialStateStatItem {
    constructor(timeStamp, diameter, total, distinct, queueSize) {
        this.timeStamp = timeStamp;
        this.diameter = diameter;
        this.total = total;
        this.distinct = distinct;
        this.queueSize = queueSize;
    }
}
exports.InitialStateStatItem = InitialStateStatItem;
/**
 * Statistics on coverage.
 */
class CoverageItem {
    constructor(module, action, filePath, range, total, distinct) {
        this.module = module;
        this.action = action;
        this.filePath = filePath;
        this.range = range;
        this.total = total;
        this.distinct = distinct;
    }
}
exports.CoverageItem = CoverageItem;
var MessageSpanType;
(function (MessageSpanType) {
    MessageSpanType["Text"] = "T";
    MessageSpanType["SourceLink"] = "SL";
})(MessageSpanType || (MessageSpanType = {}));
class MessageSpan {
    constructor(type, text, filePath, location) {
        this.type = type;
        this.text = text;
        this.filePath = filePath;
        this.location = location;
    }
    static newTextSpan(text) {
        return new MessageSpan(MessageSpanType.Text, text);
    }
    static newSourceLinkSpan(text, filePath, location) {
        return new MessageSpan(MessageSpanType.SourceLink, text, filePath, location);
    }
}
exports.MessageSpan = MessageSpan;
/**
 * Represents an error or warning line of a message.
 */
class MessageLine {
    constructor(spans) {
        this.spans = spans;
    }
    static fromText(text) {
        return new MessageLine([MessageSpan.newTextSpan(text)]);
    }
    toString() {
        return this.spans.map((s) => s.text).join('');
    }
}
exports.MessageLine = MessageLine;
/**
 * Type of value change between two consecutive states.
 */
var Change;
(function (Change) {
    Change["NOT_CHANGED"] = "N";
    Change["ADDED"] = "A";
    Change["MODIFIED"] = "M";
    Change["DELETED"] = "D";
})(Change = exports.Change || (exports.Change = {}));
/**
 * Base class for values.
 */
class Value {
    constructor(key, str) {
        this.key = key;
        this.str = str;
        this.changeType = Change.NOT_CHANGED;
        Value.idCounter += Value.idStep;
        this.id = Value.idCounter;
    }
    /**
     * Switches off ID incrementation. For tests only.
     */
    static switchIdsOff() {
        Value.idStep = 0;
    }
    /**
     * Switches on ID incrementation. For tests only.
     */
    static switchIdsOn() {
        Value.idStep = 1;
    }
    setModified() {
        this.changeType = Change.MODIFIED;
        return this;
    }
    setAdded() {
        this.changeType = Change.ADDED;
        return this;
    }
    setDeleted() {
        this.changeType = Change.MODIFIED;
        return this;
    }
    /**
     * Adds formatted representation of the value to the given array of strings.
     */
    format(indent) {
        return `${this.str}`;
    }
}
exports.Value = Value;
Value.idCounter = 0;
Value.idStep = 1;
/**
 * A value that is represented by some variable name.
 */
class NameValue extends Value {
    constructor(key, name) {
        super(key, name);
    }
}
exports.NameValue = NameValue;
/**
 * Value that is a collection of other values.
 */
class CollectionValue extends Value {
    constructor(key, items, prefix, postfix, toStr) {
        super(key, makeCollectionValueString(items, prefix, postfix, ', ', toStr || (v => v.str)));
        this.items = items;
        this.prefix = prefix;
        this.postfix = postfix;
        this.expandSingle = true;
    }
    addDeletedItems(items) {
        if (!items || items.length === 0) {
            return;
        }
        if (!this.deletedItems) {
            this.deletedItems = [];
        }
        const delItems = this.deletedItems;
        items.forEach(delItem => {
            const newValue = new Value(delItem.key, delItem.str); // No need in deep copy here
            newValue.changeType = Change.DELETED;
            delItems.push(newValue);
        });
    }
    findItem(id) {
        for (const item of this.items) {
            if (item.changeType === Change.DELETED) {
                continue;
            }
            if (item.id === id) {
                return item;
            }
            if (item instanceof CollectionValue) {
                const subItem = item.findItem(id);
                if (subItem) {
                    return subItem;
                }
            }
        }
        return undefined;
    }
    format(indent) {
        if (this.items.length === 0) {
            return `${this.prefix}${this.postfix}`;
        }
        if (this.str.length <= VALUE_FORMAT_LENGTH_THRESHOLD) {
            return this.str;
        }
        const subIndent = indent + '  ';
        const fmtFunc = (v) => this.formatKey(subIndent, v) + '' + v.format(subIndent);
        const body = makeCollectionValueString(this.items, '', '', ',\n', fmtFunc);
        return `${this.prefix}\n${body}\n${indent}${this.postfix}`;
    }
    formatKey(indent, value) {
        return `${indent}${value.key}: `;
    }
}
exports.CollectionValue = CollectionValue;
/**
 * Represents a set: {1, "b", <<TRUE, 5>>}, {}, etc.
 */
class SetValue extends CollectionValue {
    constructor(key, items) {
        super(key, items, '{', '}');
    }
    setModified() {
        super.setModified();
        return this;
    }
    formatKey(indent, _) {
        return indent;
    }
}
exports.SetValue = SetValue;
/**
 * Represents a sequence/tuple: <<1, "b", TRUE>>, <<>>, etc.
 */
class SequenceValue extends CollectionValue {
    constructor(key, items) {
        super(key, items, '<<', '>>');
    }
    formatKey(indent, _) {
        return indent;
    }
}
exports.SequenceValue = SequenceValue;
/**
 * Represents a structure: [a |-> 'A', b |-> 34, c |-> <<TRUE, 2>>], [], etc.
 */
class StructureValue extends CollectionValue {
    constructor(key, items, preserveOrder = false) {
        if (!preserveOrder) {
            items.sort(StructureValue.compareItems);
        }
        super(key, items, '[', ']', StructureValue.itemToString);
    }
    static itemToString(item) {
        return `${item.key} |-> ${item.str}`;
    }
    static compareItems(a, b) {
        if (a.key < b.key) {
            return -1;
        }
        else if (a.key > b.key) {
            return 1;
        }
        return 0;
    }
    setModified() {
        super.setModified();
        return this;
    }
    formatKey(indent, value) {
        return `${indent}${value.key} |-> `;
    }
}
exports.StructureValue = StructureValue;
/**
 * Represents a simple function: (10 :> TRUE), ("foo" :> "bar"), etc
 */
class SimpleFunctionItem extends Value {
    constructor(key, from, to) {
        super(key, `${from.str} :> ${to.str}`);
        this.from = from;
        this.to = to;
    }
    format(indent) {
        if (this.str.length <= VALUE_FORMAT_LENGTH_THRESHOLD || !(this.to instanceof CollectionValue)) {
            return `(${this.str})`;
        }
        const body = this.to.format(indent + '  ');
        return `(${this.from.str} :> ${body}\n${indent})`;
    }
}
exports.SimpleFunctionItem = SimpleFunctionItem;
/**
 * Represents a collection of merged simple functions: (10 :> TRUE),
 * ("foo" :> "bar" @@ "baz" => 31), etc
 */
class SimpleFunction extends Value {
    constructor(key, items) {
        super(key, makeCollectionValueString(items, '(', ')', ' @@ ', (v => v.str)));
        this.items = items;
        this.expandSingle = false;
    }
    format(indent) {
        if (this.items.length === 1) {
            return this.items[0].format(indent);
        }
        return super.format(indent);
    }
}
exports.SimpleFunction = SimpleFunction;
/**
 * A state of a process in a particular moment of time.
 */
class ErrorTraceItem {
    constructor(num, title, module, action, filePath, range, variables // Variables are presented as items of a structure
    ) {
        this.num = num;
        this.title = title;
        this.module = module;
        this.action = action;
        this.filePath = filePath;
        this.range = range;
        this.variables = variables;
    }
}
exports.ErrorTraceItem = ErrorTraceItem;
/**
 * An output line produced by Print/PrintT along with the number of consecutive occurrences.
 */
class OutputLine {
    constructor(text) {
        this.text = text;
        this.count = 1;
    }
    increment() {
        this.count += 1;
    }
}
exports.OutputLine = OutputLine;
/**
 * A warning, issued by TLC.
 */
class WarningInfo {
    constructor(lines) {
        this.lines = lines;
    }
}
exports.WarningInfo = WarningInfo;
/**
 * An error, issued by TLC.
 */
class ErrorInfo {
    constructor(lines, errorTrace) {
        this.lines = lines;
        this.errorTrace = errorTrace;
    }
}
exports.ErrorInfo = ErrorInfo;
var ModelCheckResultSource;
(function (ModelCheckResultSource) {
    ModelCheckResultSource[ModelCheckResultSource["Process"] = 0] = "Process";
    ModelCheckResultSource[ModelCheckResultSource["OutFile"] = 1] = "OutFile"; // The result comes from a .out file
})(ModelCheckResultSource = exports.ModelCheckResultSource || (exports.ModelCheckResultSource = {}));
class SpecFiles {
    constructor(tlaFilePath, cfgFilePath) {
        this.tlaFilePath = tlaFilePath;
        this.cfgFilePath = cfgFilePath;
        this.tlaFileName = path.basename(tlaFilePath);
        this.cfgFileName = path.basename(cfgFilePath);
    }
}
exports.SpecFiles = SpecFiles;
/**
 * Represents the state of a TLA model checking process.
 */
class ModelCheckResult {
    constructor(source, specFiles, showFullOutput, state, status, processInfo, initialStatesStat, coverageStat, warnings, errors, sanyMessages, startDateTime, endDateTime, duration, workersCount, collisionProbability, outputLines) {
        this.source = source;
        this.specFiles = specFiles;
        this.showFullOutput = showFullOutput;
        this.state = state;
        this.status = status;
        this.processInfo = processInfo;
        this.initialStatesStat = initialStatesStat;
        this.coverageStat = coverageStat;
        this.warnings = warnings;
        this.errors = errors;
        this.sanyMessages = sanyMessages;
        this.startDateTime = startDateTime;
        this.endDateTime = endDateTime;
        this.duration = duration;
        this.workersCount = workersCount;
        this.collisionProbability = collisionProbability;
        this.outputLines = outputLines;
        this.stateName = getStateName(this.state);
        this.startDateTimeStr = dateTimeToStr(startDateTime);
        this.endDateTimeStr = dateTimeToStr(endDateTime);
        this.durationStr = durationToStr(duration);
        let statusDetails;
        switch (state) {
            case CheckState.Running:
                statusDetails = getStatusName(status);
                break;
            case CheckState.Success:
                statusDetails = collisionProbability
                    ? `Fingerprint collision probability: ${collisionProbability}`
                    : '';
                break;
            case CheckState.Error:
                statusDetails = `${errors.length} error(s)`;
                break;
        }
        this.statusDetails = statusDetails;
    }
    static createEmpty(source) {
        return new ModelCheckResult(source, undefined, false, CheckState.Running, CheckStatus.Starting, undefined, [], [], [], [], undefined, undefined, undefined, undefined, 0, undefined, []);
    }
    formatValue(valueId) {
        for (const err of this.errors) {
            for (const items of err.errorTrace) {
                const value = items.variables.findItem(valueId);
                if (value) {
                    return value.format('');
                }
            }
        }
        return undefined;
    }
}
exports.ModelCheckResult = ModelCheckResult;
function getStateName(state) {
    const name = STATE_NAMES.get(state);
    if (typeof name !== 'undefined') {
        return name;
    }
    throw new Error(`Name not defined for check state ${state}`);
}
function getStatusName(status) {
    const name = STATUS_NAMES.get(status);
    if (name) {
        return name;
    }
    throw new Error(`Name not defined for check status ${status}`);
}
exports.getStatusName = getStatusName;
/**
 * Recursively finds and marks all the changes between two collections.
 */
function findChanges(prev, state) {
    let pi = 0;
    let si = 0;
    let modified = false;
    const deletedItems = [];
    while (pi < prev.items.length && si < state.items.length) {
        const prevValue = prev.items[pi];
        const stateValue = state.items[si];
        if (prevValue.key > stateValue.key) {
            stateValue.changeType = Change.ADDED;
            modified = true;
            si += 1;
        }
        else if (prevValue.key < stateValue.key) {
            deletedItems.push(prevValue);
            pi += 1;
        }
        else {
            if (prevValue instanceof CollectionValue && stateValue instanceof CollectionValue) {
                modified = findChanges(prevValue, stateValue) || modified;
            }
            else if (prevValue.str !== stateValue.str) {
                stateValue.changeType = Change.MODIFIED;
                modified = true;
            }
            si += 1;
            pi += 1;
        }
    }
    for (; si < state.items.length; si++) {
        state.items[si].changeType = Change.ADDED;
        modified = true;
    }
    for (; pi < prev.items.length; pi++) {
        deletedItems.push(prev.items[pi]);
    }
    state.addDeletedItems(deletedItems);
    modified = modified || deletedItems.length > 0;
    if (modified) {
        state.changeType = Change.MODIFIED;
    }
    return modified;
}
exports.findChanges = findChanges;
function dateTimeToStr(dateTime) {
    if (!dateTime) {
        return 'not yet';
    }
    return dateTime.format('HH:mm:ss (MMM D)');
}
function durationToStr(dur) {
    if (!util_1.isNumber(dur)) {
        return '';
    }
    return `${dur} msec`;
}
function makeCollectionValueString(items, prefix, postfix, delimiter, toStr) {
    // TODO: trim to fit into 100 symbols
    const valuesStr = items
        .filter(i => i.changeType !== Change.DELETED)
        .map(i => toStr(i))
        .join(delimiter);
    return prefix + valuesStr + postfix;
}
//# sourceMappingURL=check.js.map