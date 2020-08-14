const Promise = require('bluebird');
const assert = require('chai').assert;
const TestState = require('./_helpers/TestState');
const TruffleHelper = require('./_helpers/TruffleHelper');

describe('Ethereum.js', function () {

    let ethereum = null;

    before('#constructor()', async function () {
        ethereum = await TestState.get('forked').ethereum;
    });

    it('#getBlockNumber()', async function () {
        let blockNumber = await ethereum.getBlockNumber();
        assert.isAbove(blockNumber, -1);
    });

});

