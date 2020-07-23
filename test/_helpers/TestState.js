const Db = require('../../js/Db');
const Compound = require('../../js/Compound');
const Ethereum = require('../../js/Ethereum');

const config = require('./TestConfig');

let testState = null;

class TestState {

    constructor() {
        this.db = new Db(config.db);
        this.ethereum = new Ethereum(config.ethereum, this);
        this.compound = new Compound(config.compound, this);
    }

    reset() {
        this.db = null;
        this.ethereum = null;
    }

    static get() {
        if (!testState) testState = new TestState();
        return testState
    }

}

module.exports = TestState;
