const assert = require('chai').assert;
const jsonfile = require('jsonfile');

const TestState = require('./_helpers/TestState');
const MockCompound = require('./_helpers/MockCompound');

describe('Compound.js', function () {

    let compound;
    let mockCompound;

    before('MockCompound.get()', async function() {
        mockCompound = await MockCompound.get();
    });

    before('#constructor()', async function () {
        compound = TestState.get().compound;
    });

    it('#updateBalances(0.1, 0.1)', async function() {
        let result = await compound.updateBalances(0.1, 0.1);
        assert.equal(result.length, 10, "10 results");
    });

    it('#updateBalances(0.1, 0.5)', async function() {
        let result = await compound.updateBalances(0.1, 0.5);
        assert.equal(result.length, 1, "1 results");
    });

    it('#updateBalances(1, 0.5)', async function() {
        let result = await compound.updateBalances(1, 0.5);
        assert.equal(result.length, 5, "5 results");
    });

    it('#updateBalances(1, 10)', async function() {
        let result = await compound.updateBalances(1, 10);
        assert.equal(result.length, 0, "no results");
    });

});