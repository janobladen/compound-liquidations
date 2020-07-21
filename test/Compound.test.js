const assert = require('chai').assert;

const Compound = require('../js/Compound');
const ethHelper = require('./_helpers/EthHelper');
const dbHelper = require('./_helpers/DbHelper');
const compoundHelper = require('./_helpers/CompoundHelper');

describe('Compound.js', function () {

    let compound;

    before('Initialize Compound', async function () {
        const ethereum = ethHelper.forRinkeby();
        const db = dbHelper.getTestDb();
        const {accountService} = compoundHelper.getConfig();
        compound = new Compound({ethereum, db, accountService});
    });

    it('#updateBalances', async function() {
        await compound.updateBalances();
    });

    after('Disconnect database', function() {
        //compound.db.disconnect();
    });
});