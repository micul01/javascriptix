
class TokenType {
    constructor(allowedInside) {
        this.allowedInside = allowedInside;        
        this.starts = () => false;
        this.ends = () => true;
        this.adjustedEnd = i => i;
    }

    embeddedDetected(text, index) {
        return this.allowedInside && this.allowedInside.find(token => token.starts(text, index));  
    }

    afterEmbedded(text, index) {
        return this.embeddedDetected(text, index).getEnd(text, index + 1);
    }

    getEnd(text, i) {
        while (i <= text.length) {
            if (this.ends(text, i)) {
                return this.adjustedEnd(i);
            }
            if (this.embeddedDetected(text, i)){
                i = this.afterEmbedded(text, i);
            }
            i++;
        }
        return -1;
    }
}

class Token {
    constructor(text, startIndex, endIndex) {
        this.complete = startIndex < endIndex;
        this.word = text.slice(startIndex, endIndex);
        this.rest = text.slice(endIndex);
    }
}

let either = (...fcts) => (...args) => fcts.some(f => f.apply(null, args));
let allTrue = (...fcts) => (...args) => fcts.every(f => f.apply(null, args));
let not = f => (...args) => !f.apply(null, args);

let matches = chars => (text, index) => chars.includes(text[index]); 
let previous = f => (text, index) => f(text, index - 1);
let inputEnded = (s, i) => s.length < i + 1;

let comment = new TokenType();
comment.starts = matches('#'); 
comment.ends = either(matches('\n'), inputEnded);

let singleQuoted = new TokenType();
let isEscaped = previous(matches('\\'));
singleQuoted.starts = allTrue(matches('\''), not(isEscaped));
singleQuoted.ends = matches('\'');

let doubleQuoted = new TokenType();
doubleQuoted.starts = allTrue(matches('"'), not(isEscaped));
doubleQuoted.ends = allTrue(matches('"'), not(isEscaped));

let whitespace = new TokenType();
let isWhitespace = matches(' \t');
whitespace.starts = isWhitespace;
whitespace.ends = either(not(isWhitespace), inputEnded);
whitespace.adjustedEnd = i => i - 1;

let word = new TokenType([singleQuoted, doubleQuoted]);
word.starts = not(isWhitespace);
word.ends = either(isWhitespace, inputEnded);
word.adjustedEnd = i => i - 1;

let findTokenStarting = function (text, i) {
    return [comment, singleQuoted, doubleQuoted, word, whitespace]
        .find(token => token.starts(text, i));
};

let shouldBeSkipped = (token) => [comment, whitespace].includes(token);

function extractWord(text, start) {
    if (start >= text.length) {
        return new Token(text, start, start);
    }    
    let token = findTokenStarting(text, start);
    let end = token.getEnd(text, start + 1) + 1;
    if (shouldBeSkipped(token)) {
        return extractWord(text, end);
    } else {
        return new Token(text, start, end);    
    }
}

let tokenize = (text) => extractWord(text, 0);

let cases = [
    ['a b', 'a'],
    [' b', 'b'],
    ['b', 'b'],
    ['abcde', 'abcde'],
    ['abc"d"e', 'abc"d"e'],
    ['abcd\'e\'', 'abcd\'e\''],
    ['abc#nocomment de', 'abc#nocomment'],
    ['abc #comment', 'abc'],
    ['#a b c', ''],
    ['#a b c\nde', 'de'],
    ['"double quoted"', '"double quoted"'],
    ['      echo me', 'echo']
];

let failed = cases.filter(tc => {
    let result = tokenize(tc[0]);
    return !result || result.word != tc[1]; 
});

failed.forEach(tc => {
    console.log(`>${tc[0]}<  -> `, tokenize(tc[0])); 
});