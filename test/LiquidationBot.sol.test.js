const assert = require('chai').assert;
const {ether} = require('@openzeppelin/test-helpers');

const Compound = require('../js/Compound');
const TestState = require('./_helpers/TestState');
const TruffleHelper = require('./_helpers/TruffleHelper');

describe('LiquidationBot.sol', function () {

    let forkedChain;
    let compound;
    let contract;

    before('Create test execution environment.', async function () {
        let state = await TestState.get('forked');
        forkedChain = state.ethereum;
        compound = state.compound;
        let contracts = await TruffleHelper.deployTo(forkedChain);
        contract = contracts['LiquidationBot'];
    });

    before('Borrow some DAI from compound.', async function () {
        let accounts = await forkedChain.getAccounts();
        let DAI = await compound.getContract('DAI');
        let cDAI = await compound.getContract('cDAI');
        let cETH = await compound.getContract('cETH');
        await cETH.methods.mint().send({
            from: accounts[0],
            value: forkedChain.toWei('1', 'ether'),
            gas: 400000
        })
        await cDAI.methods.borrow('100').send({
            from: accounts[0],
            gas: 400000
        });
        let balance = await DAI.methods.balanceOf(accounts[0]).call();
        await DAI.methods.transfer(contract.options.address, balance).send({
            from: accounts[0]
        });
        await DAI.methods.balanceOf(contract.options.address).call();
    });

    it('fund()', async function () {
        let balance;
        let web3 = await forkedChain.getWeb3();
        let accounts = await forkedChain.getAccounts();
        balance = await web3.eth.getBalance(accounts[0]);
        balance = forkedChain.fromWei(balance, 'ether');
        balance = Compound.parseNumber(balance, 4);
        assert.isAtLeast(balance, 90);
        await contract.methods.fund().send({
            from: accounts[0],
            value: forkedChain.toWei('1', 'ether')
        });
        balance = await web3.eth.getBalance(contract.options.address);
        balance = forkedChain.fromWei(balance, 'ether');
        balance = Compound.parseNumber(balance, 4);
        assert.isAtLeast(balance, 1);
    });

    it('fund().send({notOwner})', async function () {
        let accounts = await forkedChain.getAccounts();
        try {
            await contract.methods.fund().send({
                from: accounts[1],
                value: forkedChain.toWei('1', 'ether')
            });
        } catch (err) {
            assert.match(err, /revert/);
            return;
        }
        assert.fail('Funding the contract without owning it should revert.');
    });

    it('Sending funds directly to contract', async function () {
        let accounts = await forkedChain.getAccounts();
        let web3 = await forkedChain.getWeb3();
        try {
            await web3.eth.sendTransaction({
                from: accounts[0],
                to: contract.options.address,
                value: forkedChain.toWei('1', 'ether')
            });
        } catch (err) {
            assert.match(err, /revert/);
            return;
        }
        assert.fail('Sending funds directly to the contract should fail.');
    });

    it('drain()', async function () {
        let balance;
        let accounts = await forkedChain.getAccounts();
        let DAI = await compound.getContract('DAI');
        balance = await DAI.methods.balanceOf(accounts[0]).call();
        assert.equal(balance, 0, 'DAI balance of owner before drain');
        balance = await DAI.methods.balanceOf(contract.options.address).call();
        assert.isAtLeast(balance, 100, 'DAI balance of contract before drain');
        let receipt = await contract.methods.drain(DAI.options.address).send({
            from: accounts[0]
        });
        balance = await DAI.methods.balanceOf(accounts[0]).call();
        assert.isAtLeast(balance, 100, 'DAI balance of owner after drain');
        balance = await DAI.methods.balanceOf(contract.options.address).call();
        assert.equal(balance, 0, 'DAI balance of contract after drain');
    });

    it('drain().from("notOwner")', async function () {
        let accounts = await forkedChain.getAccounts();
        let DAI = await compound.getContract('DAI');
        try {
            await contract.methods.drain(DAI.options.address).send({
                from: accounts[1]
            });
        } catch (err) {
            return;
        }
        assert.fail('Calling drain() by other account than owner was expected to fail.');
    });

});
