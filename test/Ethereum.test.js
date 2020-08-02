const Promise = require('bluebird');
const assert = require('chai').assert;
const TestState = require('./_helpers/TestState');
const TruffleHelper = require('./_helpers/TruffleHelper');

describe('Ethereum.js', function () {

    let ethereum = null;

    before('#constructor()', async function () {
        ethereum = TestState.get().ethereum;
    });

    it('#getBlockNumber()', async function () {
        let blockNumber = await ethereum.getBlockNumber();
        assert.isAbove(blockNumber, -1);
    });

    it("#on('block', ...)", async function() {
        this.timeout(1000);
        let txHash = null;
        let p = new Promise(function(resolve, reject) {
            ethereum.on('block', function(block) {
                resolve();
            });
        });
        let web3 = await ethereum.getWeb3();
        let accounts = await web3.eth.getAccounts();
        web3.eth.sendTransaction({
            from: accounts[0],
            to: accounts[1],
            value: web3.utils.toWei('0.01', 'ether')
        });
        return p;
    });

});

