'use strict';

const FILE = process.argv[2];
const OUTPUT = process.argv[3] ? process.argv[3] : './';

let {graph} = require('./index.js');

graph({
    file: FILE,
    output: OUTPUT,
    onRead: (buffer, format, bufferIdx)=> console.log(`[${bufferIdx}] ${Math.round(1024 * 512 / 2 / format.sampleRate * (bufferIdx))}s`)
});
