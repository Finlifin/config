"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrevText = void 0;
function getPrevText(document, position) {
    return position.character === 0
        ? ''
        : document.lineAt(position.line).text.substring(0, position.character);
}
exports.getPrevText = getPrevText;
//# sourceMappingURL=completions.js.map