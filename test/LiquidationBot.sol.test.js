const assert = require('chai').assert;

const TestState = require('./_helpers/TestState');
const TruffleHelper = require('./_helpers/TruffleHelper');

describe('LiquidationBot.sol', function() {

    let forkedChain;

    before('Create test execution environment.', async function() {
        forkedChain = (await TestState.get('forked')).ethereum;
        await TruffleHelper.deployTo(forkedChain);
    });

    it('Stub...', function() {});

});
