const SYMBOLS = {
  "{": "}",
  "[": "]",
  "<": ">",
};

export function commaSplit(content: string) {
  const stack = [];
  const data = [];
  let currentPosition = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    // add the current character to the stack if it is an opening symbol
    if (SYMBOLS[char] || (char === '"' && stack[stack.length - 1] !== '"')) {
      stack.push(char);
    }
    // remove the last element from the stack if the current character is the closing symbol of the last element
    else if (
      SYMBOLS[stack[stack.length - 1]] === char ||
      (char === '"' && stack[stack.length - 1] === '"')
    ) {
      stack.pop();
    }

    // if the current character is a comma and the stack is empty, then split the content
    if (char === "," && stack.length === 0) {
      data.push(content.slice(currentPosition, i));
      currentPosition = i + 1;
    } else if (i === content.length - 1) {
      data.push(content.slice(currentPosition));
    }
  }

  return data;
}

export function isKebabCase(s: string) {
  return s.match(/^[a-z]+(-[a-z]+)*$/) !== null;
}
