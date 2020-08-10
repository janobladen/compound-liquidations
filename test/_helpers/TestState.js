const Compound = require('../../js/Compound');
const Ethereum = require('../../js/Ethereum');
const PriceOracle = require('../../js/PriceOracle');

const config = require('./TestConfig');

let testState = {
    mainnet: null,
    forked: null
};

class TestState {

    constructor(configName) {
        this.name = configName;
        this.ethereum = new Ethereum(config.ethereum[this.name], this);
        this.compound = new Compound(config.compound, this);
        this.priceOracle = new PriceOracle(config.priceOracle, this);
    }

    static get(configName) {
        if (!testState[configName]) testState[configName] = new TestState(configName);
        return testState[configName];
    }

}

module.exports = TestState;
