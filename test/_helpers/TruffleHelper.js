const _ = require('underscore');
const {ChildService} = require('child-service');
const execa = require('execa');
const Promise = require('bluebird');
const URI = require('uri-js');

const TestConfig = require("./TestConfig.js");

const _readdir = Promise.promisify(require('fs').readdir);
const _stat = Promise.promisify(require('fs').stat);

let isCompiled = false;
let lastCompileResult = null;
let ganachCli = false;

const TruffleHelper = {

    reset: function () {
        isCompiled = false;
        lastCompileResult = null;
    },
    compile: async function () {
        if (isCompiled) return lastCompileResult;
        const mustCompile = await Promise.reduce(await _readdir('./sol/contracts'), async function (memo, file) {
            if (memo) return true;
            if (!file.startsWith('Mock')) return false;
            const statSrc = await _stat('./sol/contracts/' + file);
            try {
                const statDest = await _stat('./sol/build/' + file.replace('.sol', '.json'));
                return statSrc.mtimeMs > statDest.mtimeMs;
            } catch (e) {
                return true;
            }
        }, false);


        if (mustCompile) lastCompileResult = await execa.command('./node_modules/.bin/truffle compile');
        isCompiled = true;
        return lastCompileResult
    },

    startGanache: async function () {
        if (!ganachCli) {
            let ganacheUri = URI.parse(TestConfig.ganache.uri);
            ganachCli = new ChildService({
                command: "node_modules/.bin/ganache-cli",
                args: ["-p", ganacheUri.port,
                    "-m", '"' + TestConfig.ganache.mnemonic + '"',
                    "-f", '"' + TestConfig.ganache.forkUri + '"',
                    "-d"],
                readyRegex: /Listening on/,
            });
            await ganachCli.start();
        }
        return ganachCli;
    },

    stopGanache: async function () {
        if (ganachCli) await ganachCli.stop();
        ganachCli = null;
    }

};

module.exports = TruffleHelper;