const assert = require('chai').assert;
const sinon = require('sinon');
const _ = require('underscore');

const TestState = require('./_helpers/TestState');
const mockData = require('./resources/compound.accountService.json');


describe('Compound.js', function () {

    let compound;
    let mockCompound;
    let accountServiceStub;


    before('#constructor()', async function () {
        compound = TestState.get().compound;
        accountServiceStub = sinon.stub(compound, '_fetchAccountService').returns(mockData);
    });


    it('#listAccounts({maxHealth: 0.1, minWorthInEth: 0.01})', async function() {
        let result = await compound.listAccounts({minWorthInEth: 0.01});
        assert.isArray(result);
        assert.equal(result.length, 10, "9 results");
    });

    it('#listAccounts() result is sorted', async function() {
        let result = await compound.listAccounts({minWorthInEth: 0.01});
        _.reduce(result, function(memo, account) {
            if (memo === null) return account.borrowValue;
            assert.isAtMost(account.borrowValue, memo, "Value of account is less the previous account in list.");
            return account.borrowValue;
        }, null);
    });

    after('Remove test stubs.', function() {
        accountServiceStub.restore();
    });

});