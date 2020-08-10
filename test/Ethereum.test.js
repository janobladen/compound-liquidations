const Promise = require('bluebird');
const assert = require('chai').assert;
const TestState = require('./_helpers/TestState');
const TruffleHelper = require('./_helpers/TruffleHelper');

describe('Ethereum.js', function () {

    let ethereum = null;

    before('Start ganache CLI', async function() {
        await TruffleHelper.startGanache();
    });

    before('#constructor()', async function () {
        ethereum = TestState.get('forked').ethereum;
    });

    it('#getBlockNumber()', async function () {
        let blockNumber = await ethereum.getBlockNumber();
        assert.isAbove(blockNumber, -1);
    });

    after("Stop ganache CLI", async function() {
        TruffleHelper.stopGanache();
    });

});

