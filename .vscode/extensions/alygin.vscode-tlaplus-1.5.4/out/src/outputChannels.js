"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolOutputChannel = void 0;
const vscode = require("vscode");
const outputHandler_1 = require("./outputHandler");
class OutputToOutChannelSender extends outputHandler_1.ProcessOutputHandler {
    constructor(source, outChannel, lineMapper) {
        super(source);
        this.outChannel = outChannel;
        this.lineMapper = lineMapper;
    }
    handleLine(line) {
        if (!line) {
            return;
        }
        const eLine = this.lineMapper ? this.lineMapper(line) : line;
        if (eLine) {
            this.outChannel.appendLine(eLine);
        }
    }
}
/**
 * Manages an output channel and sends output of tool processes to that channel.
 */
class ToolOutputChannel {
    constructor(name, lineMapper) {
        this.name = name;
        this.lineMapper = lineMapper;
    }
    bindTo(procInfo) {
        const channel = this.getChannel();
        channel.clear();
        channel.appendLine(procInfo.commandLine);
        channel.appendLine('');
        this.outSender = new OutputToOutChannelSender(procInfo.process.stdout, channel, this.lineMapper);
    }
    revealWindow() {
        this.getChannel().show();
    }
    clear() {
        this.getChannel().clear();
    }
    appendLine(line) {
        this.getChannel().appendLine(line);
    }
    getChannel() {
        if (!this.outChannel) {
            this.outChannel = vscode.window.createOutputChannel(this.name);
        }
        return this.outChannel;
    }
}
exports.ToolOutputChannel = ToolOutputChannel;
//# sourceMappingURL=outputChannels.js.map