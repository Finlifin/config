"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVariableValue = void 0;
const check_1 = require("../model/check");
const common_1 = require("../common");
const vscode_1 = require("vscode");
var TokenType;
(function (TokenType) {
    TokenType[TokenType["Primitive"] = 0] = "Primitive";
    TokenType[TokenType["Range"] = 1] = "Range";
    TokenType[TokenType["Name"] = 2] = "Name";
    TokenType[TokenType["SetStart"] = 3] = "SetStart";
    TokenType[TokenType["SetEnd"] = 4] = "SetEnd";
    TokenType[TokenType["SequenceStart"] = 5] = "SequenceStart";
    TokenType[TokenType["SequenceEnd"] = 6] = "SequenceEnd";
    TokenType[TokenType["StructureStart"] = 7] = "StructureStart";
    TokenType[TokenType["StructureEnd"] = 8] = "StructureEnd";
    TokenType[TokenType["StructureItemSeparator"] = 9] = "StructureItemSeparator";
    TokenType[TokenType["FunctionStart"] = 10] = "FunctionStart";
    TokenType[TokenType["FunctionEnd"] = 11] = "FunctionEnd";
    TokenType[TokenType["ColonBracket"] = 12] = "ColonBracket";
    TokenType[TokenType["AtAt"] = 13] = "AtAt";
    TokenType[TokenType["Comma"] = 14] = "Comma";
    TokenType[TokenType["End"] = 15] = "End";
})(TokenType || (TokenType = {}));
class Token {
    constructor(type, str) {
        this.type = type;
        this.str = str;
    }
}
Token.END = new Token(TokenType.End, '');
/**
 * These tokens can be captured by comparing with constant strings.
 */
const CONST_TOKENS = [
    new Token(TokenType.SetStart, '{'),
    new Token(TokenType.SetEnd, '}'),
    new Token(TokenType.SequenceStart, '<<'),
    new Token(TokenType.SequenceEnd, '>>'),
    new Token(TokenType.StructureStart, '['),
    new Token(TokenType.StructureEnd, ']'),
    new Token(TokenType.FunctionStart, '('),
    new Token(TokenType.FunctionEnd, ')'),
    new Token(TokenType.StructureItemSeparator, '|->'),
    new Token(TokenType.Comma, ','),
    new Token(TokenType.ColonBracket, ':>'),
    new Token(TokenType.AtAt, '@@')
];
const UNKNOWN_FROM = new check_1.Value('from', '?');
const UNKNOWN_TO = new check_1.Value('to', '?');
/**
 * Breaks the given set of lines and allows to read them token-by-token.
 */
class Tokenizer {
    constructor(lines) {
        this.lineIdx = 0;
        this.colIdx = 0;
        this.position = new vscode_1.Position(0, 0);
        this.lines = lines;
        this.tryReadNumberToken = this.tryReadNumberToken.bind(this);
        this.tryReadStringToken = this.tryReadStringToken.bind(this);
        this.tryReadBooleanToken = this.tryReadBooleanToken.bind(this);
        this.tryReadRangeToken = this.tryReadRangeToken.bind(this);
        this.tryReadNameToken = this.tryReadNameToken.bind(this);
    }
    nextToken() {
        const str = this.nextStr();
        if (str === null) {
            return Token.END;
        }
        for (const token of CONST_TOKENS) {
            if (str.startsWith(token.str)) {
                this.colIdx += token.str.length;
                return token;
            }
        }
        const tokenFuncs = [
            this.tryReadRangeToken,
            this.tryReadNumberToken,
            this.tryReadStringToken,
            this.tryReadBooleanToken,
            this.tryReadNameToken
        ];
        for (const func of tokenFuncs) {
            const token = func(str);
            if (token !== null) {
                return token;
            }
        }
        throw new common_1.ParsingError(`Cannot parse variable value at ${this.getPosition()}: ${str}`);
    }
    getPosition() {
        return `line ${this.position.line}, column ${this.position.character}`;
    }
    /**
     * Finds next piece of string to be parsed.
     * The resulting string must not be empty or start with space.
     */
    nextStr() {
        while (this.lineIdx < this.lines.length) {
            const line = this.lines[this.lineIdx];
            while (this.colIdx < line.length && line[this.colIdx] === ' ') {
                this.colIdx += 1;
            }
            if (this.colIdx === line.length) {
                this.lineIdx += 1;
                this.colIdx = 0;
                continue;
            }
            this.position = new vscode_1.Position(this.lineIdx + 1, this.colIdx + 1);
            return line.substring(this.colIdx);
        }
        this.position = new vscode_1.Position(this.lines.length, this.lines[this.lines.length - 1].length);
        return null;
    }
    tryReadStringToken(str) {
        if (!str.startsWith('"')) {
            return null;
        }
        let i = 1;
        let escape = false;
        while (i < str.length) {
            if (!escape) {
                const ch = str[i];
                if (ch === '\\') {
                    escape = true;
                }
                else if (ch === '"') {
                    this.colIdx += i + 1;
                    return new Token(TokenType.Primitive, str.substring(0, i + 1));
                }
            }
            else {
                escape = false;
            }
            i += 1;
        }
        throw new common_1.ParsingError(`Unexpected end of line while parsing string at ${this.getPosition()}`);
    }
    tryReadNumberToken(str) {
        return this.tryRegexpToken(str, /^(-?\d+)/g, TokenType.Primitive);
    }
    tryReadBooleanToken(str) {
        return this.tryRegexpToken(str, /^(TRUE|FALSE)/g, TokenType.Primitive);
    }
    tryReadRangeToken(str) {
        return this.tryRegexpToken(str, /^(-?\d+\.\.-?\d+)/g, TokenType.Range);
    }
    tryReadNameToken(str) {
        return this.tryRegexpToken(str, /^(\w+)/g, TokenType.Name);
    }
    tryRegexpToken(str, regexp, type) {
        const matches = regexp.exec(str);
        if (matches) {
            this.colIdx += matches[1].length;
            return new Token(type, matches[1]);
        }
        return null;
    }
}
/**
 * Parses a set of lines that contain a variable value.
 * It's assumed that the given set of lines came from a TLC output, which means they follow
 * certain simple rules, like no line breaks in the middle of a token, etc.
 */
function parseVariableValue(name, lines) {
    const tokenizer = new Tokenizer(lines);
    try {
        return parseValue(name, tokenizer.nextToken(), tokenizer);
    }
    catch (err) {
        console.log(`Error parsing value of variable \`${name}\`: ${err}`);
        return new check_1.Value(name, lines.join(' '));
    }
}
exports.parseVariableValue = parseVariableValue;
function parseValue(key, token, tokenizer) {
    if (token.type === TokenType.End) {
        throw new common_1.ParsingError(`Unexpected end while parsing value at ${tokenizer.getPosition()}`);
    }
    if (token.type === TokenType.Name) {
        return new check_1.NameValue(key, token.str);
    }
    if (token.type === TokenType.Primitive || token.type === TokenType.Range) {
        return new check_1.Value(key, token.str);
    }
    if (token.type === TokenType.SetStart) {
        const items = parseCollectionItems(tokenizer, TokenType.SetEnd, TokenType.Comma, parseValue);
        return new check_1.SetValue(key, items);
    }
    if (token.type === TokenType.SequenceStart) {
        const items = parseCollectionItems(tokenizer, TokenType.SequenceEnd, TokenType.Comma, parseValue);
        return new check_1.SequenceValue(key, items);
    }
    if (token.type === TokenType.StructureStart) {
        const items = parseCollectionItems(tokenizer, TokenType.StructureEnd, TokenType.Comma, parseStructureItem);
        return new check_1.StructureValue(key, items);
    }
    if (token.type === TokenType.FunctionStart) {
        const items = parseCollectionItems(tokenizer, TokenType.FunctionEnd, TokenType.AtAt, parseFunctionItem);
        return new check_1.SimpleFunction(key, items);
    }
    throw new common_1.ParsingError(`Unexpected token at ${tokenizer.getPosition()}: ${token.str}`);
}
function parseCollectionItems(tokenizer, endTokenType, delimiterTokenType, valueParser) {
    const items = [];
    let canClose = true;
    let canComma = false;
    for (;;) {
        const token = tokenizer.nextToken();
        if (token.type === endTokenType) {
            if (!canClose) {
                throw new common_1.ParsingError(`Unexpected end of collection at ${tokenizer.getPosition()}: ${token.str}`);
            }
            return items;
        }
        if (token.type === delimiterTokenType) {
            if (!canComma) {
                throw new common_1.ParsingError(`Unexpected comma at ${tokenizer.getPosition()}: ${token.str}`);
            }
            canComma = false;
            canClose = false;
        }
        else {
            items.push(valueParser(items.length + 1, token, tokenizer));
            canClose = true;
            canComma = true;
        }
    }
}
function parseStructureItem(_, token, tokenizer) {
    if (token.type !== TokenType.Name) {
        throw new common_1.ParsingError(`Expected structure item at ${tokenizer.getPosition()}, found ${token.str}`);
    }
    const nextToken = tokenizer.nextToken();
    if (nextToken.type !== TokenType.StructureItemSeparator) {
        throw new common_1.ParsingError(`Expected structure item separator at ${tokenizer.getPosition()}, found ${token.str}`);
    }
    return parseValue(token.str, tokenizer.nextToken(), tokenizer);
}
function parseFunctionItem(key, tokenFrom, tokenizer) {
    if (tokenFrom === Token.END) {
        console.log(`Unexpected function description end at ${tokenizer.getPosition()}`);
        return new check_1.SimpleFunctionItem(key, UNKNOWN_FROM, UNKNOWN_TO);
    }
    const from = parseValue('from', tokenFrom, tokenizer);
    const tokenColon = tokenizer.nextToken();
    if (tokenColon.type !== TokenType.ColonBracket) {
        console.log(`Unexpected function description end at ${tokenizer.getPosition()}`);
        return new check_1.SimpleFunctionItem(key, from, UNKNOWN_TO);
    }
    const tokenTo = tokenizer.nextToken();
    if (tokenTo === Token.END) {
        console.log(`Unexpected function description end at ${tokenizer.getPosition()}`);
        return new check_1.SimpleFunctionItem(key, from, UNKNOWN_TO);
    }
    const to = parseValue('to', tokenTo, tokenizer);
    return new check_1.SimpleFunctionItem(key, from, to);
}
//# sourceMappingURL=tlcValues.js.map