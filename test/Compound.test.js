const assert = require('chai').assert;
const BN = require('bn.js');
const sinon = require('sinon');
const _ = require('underscore');

const TestState = require('./_helpers/TestState');
const mockData = require('./resources/compound.accountService.json');

const TruffleHelper = require('./_helpers/TruffleHelper');


describe('Compound.js', function () {

    let compound;
    let ethereum;
    let accountServiceStub;

    before('Start ganache CLI', async function () {
        await TruffleHelper.startGanache();
    });

    before('#constructor()', async function () {
        compound = TestState.get('mainnet').compound;
        ethereum = TestState.get('mainnet').ethereum;
        accountServiceStub = sinon.stub(compound, '_fetchAccountService').returns(mockData);
    });

    it('#listAccounts({maxHealth: 0.1, minWorthInEth: 0.01})', async function () {
        let result = await compound.listAccounts({minWorthInEth: 0.01});
        assert.isArray(result);
        assert.equal(result.length, 10, "10 results");
    });

    it('#listAccounts() result is sorted', async function () {
        let result = await compound.listAccounts({minWorthInEth: 0.01});
        _.reduce(result, function (memo, account) {
            if (memo === null) return account.borrowValue;
            assert.isAtMost(account.borrowValue, memo, "Value of account is less the previous account in list.");
            return account.borrowValue;
        }, null);
    });

    it('#getBalanceSheetForAccount()', async function () {
        let [account] = await compound.listAccounts({minWorthInEth: 0.01});
        let result = await compound.getBalanceSheetForAccount(account.address);
        let symbols = compound.getSymbols();
        assert.hasAnyKeys(result.borrows, symbols);
        assert.hasAnyKeys(result.collaterals, symbols);
    });

    it('#highestAssetOf()', async function () {
        let [, , account] = await compound.listAccounts({minWorthInEth: 0.01});
        let balanceSheet = await compound.getBalanceSheetForAccount(account.address);
        let result = await compound.highestAssetOf(balanceSheet.collaterals);
        let symbols = compound.getSymbols();
        assert.property(result, 'symbol');
        assert.property(result, 'valueInEth');
        /* instance of bn.js */
        assert.hasAllKeys(result.valueInEth, ['negative', 'words', 'length', 'red']);
        assert.oneOf(result.symbol, symbols);
    });

    after('Remove test stubs.', function () {
        accountServiceStub.restore();
    });

    after('Stop ganache CLI', async function () {
        await TruffleHelper.stopGanache();
    });

});