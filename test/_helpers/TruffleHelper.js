const execa = require('execa');

let isCompiled = false;
let lastCompileResult = null;

const TruffleHelper = {

    reset: function () {
        isCompiled = false;
        lastCompileResult = null;
    },
    compile: async function () {
        if (isCompiled) return lastCompileResult;
        let wd = process.cwd();
        lastCompileResult = await execa.command('./node_modules/.bin/truffle compile');
        isCompiled = true;
        return lastCompileResult
    }

};

module.exports = TruffleHelper;