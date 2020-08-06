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
        compound = TestState.get().compound;
        ethereum = TestState.get().ethereum;
        accountServiceStub = sinon.stub(compound, '_fetchAccountService').returns(mockData);
    });

    before('Create some assets to work on.', async function () {
        /*
        let web3 = await ethereum.getWeb3();
        let accounts = await ethereum.getAccounts();
        let cDAI = await compound.getContract('cDAI');
        let cETH = await compound.getContract('cETH');
        let DAI = await compound.getContract('DAI');
        let Comptroller = await compound.getContract('Comptroller');
        await Comptroller.methods.enterMarkets([cDAI.options.address, cETH.options.address]).send({
            from: accounts[1]
        });
        let value = web3.utils.toWei('20', 'ether');
        let markets = await Comptroller.methods.getAssetsIn(accounts[1]).call();
        let result = null;

        result = await cETH.methods.mint().send({
            from: accounts[1],
            value,
            gasLimit: web3.utils.toHex(150000),
            gasPrice: web3.utils.toHex(20000000000)
        });

        let {1:liquidity} = await Comptroller.methods.getAccountLiquidity(accounts[1]).call();
        liquidity = web3.utils.fromWei(liquidity).toString();

        result = await cDAI.methods.borrow(100).send({
            from: accounts[1],
            gasLimit: web3.utils.toHex(500000),
            gasPrice: web3.utils.toHex(20000000000)
        });

        result = await DAI.methods.transfer(accounts[0], 100).send({
            from: accounts[1],
            gasLimit: web3.utils.toHex(500000),
            gasPrice: web3.utils.toHex(20000000000)
        });

        let balance = await DAI.methods.balanceOf(accounts[0]).call();
        balance = new BN(balance);
        assert.isTrue(balance.gte(new BN("1")), "Balance is more than 1 DAI");
    */
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
        assert.property(result.borrows, 'cWBTC');
        assert.property(result.collaterals, 'cDAI');
    });

    it('#highestAssetOf()', async function () {
        let [,,account] = await compound.listAccounts({minWorthInEth: 0.01});
        let balanceSheet = await compound.getBalanceSheetForAccount(account.address);
        let result = await compound.highestAssetOf(balanceSheet.collaterals);
        assert.equal(result.symbol, 'cDAI');
    });

    after('Remove test stubs.', function () {
        accountServiceStub.restore();
    });

    after('Stop ganache CLI', async function () {
        await TruffleHelper.stopGanache();
    });

});