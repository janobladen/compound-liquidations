const _ = require('underscore');
const {ChildService} = require('child-service');
const execa = require('execa');
var net = require('net');
const Promise = require('bluebird');
const jsonfile = require('jsonfile');
const URI = require('uri-js');

const TestConfig = require("./TestConfig.js");

const _readdir = Promise.promisify(require('fs').readdir);
const _stat = Promise.promisify(require('fs').stat);

let isCompiled = false;
let deployed = null;
let lastCompileResult = null;
let ganacheCli = false;

function _checkPort(host, port) {
    return new Promise(function (resolve, reject) {
        const server = net.createServer();
        server.once('error', function (err) {
            if (err.code === 'EADDRINUSE' || 'EADDRNOTAVAIL') {
                resolve(false);
                return;
            }
            reject(new Error('Unable to check port ' + port + ':' + err));
        });
        server.once('listening', function () {
            server.close(() => resolve(true));
        });
        server.listen(port, host);
    });
}

const TruffleHelper = {

    reset: function () {
        isCompiled = false;
        lastCompileResult = null;
    },

    compile: async function () {
        if (isCompiled) return lastCompileResult;
        let solFiles = await _readdir('./sol/contracts');
        solFiles = _.filter(solFiles, (filename) => filename.endsWith('.sol'));
        const mustCompile = await Promise.reduce(solFiles, async function (memo, file) {
            if (memo) return true;
            const statSrc = await _stat('./sol/contracts/' + file);
            try {
                const statDest = await _stat('./sol/build/' + file.replace('.sol', '.json'));
                return statSrc.mtimeMs > statDest.mtimeMs;
            } catch (e) {
                return true;
            }
        }, false);


        if (mustCompile) {
            await execa.command('./node_modules/.bin/truffle compile');
            isCompiled = true;
        }
        lastCompileResult = await Promise.reduce(solFiles, async function (memo, fileName) {
            let contractName = fileName.replace('.sol', '');
            memo[contractName] = await jsonfile.readFile('./sol/build/' + contractName + '.json');
            return memo;
        }, {});
        return lastCompileResult
    },

    deployTo: async function (ethereum) {
        if (deployed) return deployed;
        const compiled = await TruffleHelper.compile();
        const web3 = await ethereum.getWeb3();
        const accounts = await ethereum.getAccounts();
        const contractNames = ['LiquidationBot'];
        deployed = _.reduce(contractNames, function (memo, contractName) {
            let abi = compiled[contractName].abi;
            let bytecode = compiled[contractName].bytecode;
            memo[contractName] = {abi, bytecode};
            return memo;
        }, {});
        let contracts = {};
        await Promise.all(Promise.map(contractNames, function (contractName) {
            return new Promise(function (resolve, reject) {
                let contract = new web3.eth.Contract(deployed[contractName].abi);
                contract.deploy({data: deployed[contractName].bytecode})
                    .send({
                        from: accounts[0],
                        gasPrice: '20000000000',
                        gas: '6721975'
                    })
                    .on('error', function (error) {
                        reject(error);
                    })
                    .on('receipt', function(receipt) {
                        contracts[contractName] = new web3.eth.Contract(deployed[contractName].abi, receipt.contractAddress);
                        resolve(receipt.contractAddress);
                    });
            });
        }));
        return contracts;
    },

    startGanache: async function () {
        if (!ganacheCli) {
            let ganacheUri = URI.parse(TestConfig.ganache.uri);
            let isOpen = await _checkPort(ganacheUri.host, ganacheUri.port);
            if (!isOpen) {
                ganacheCli = {};
                ganacheCli.stop = () => {
                };
                return;
            }
            ganacheCli = new ChildService({
                command: "node_modules/.bin/ganache-cli",
                args: ["-p", ganacheUri.port,
                    "-m", '"' + TestConfig.ganache.mnemonic + '"',
                    "-f", '"' + TestConfig.ganache.forkUri + '"',
                    "-d"],
                readyRegex: /Listening on/,
            });
            await ganacheCli.start();
        }
        return ganacheCli;
    },

    stopGanache: async function () {
        if (ganacheCli) await ganacheCli.stop();
        ganacheCli = null;
    }

};


module.exports = TruffleHelper;