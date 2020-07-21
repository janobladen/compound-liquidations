const assert = require('chai').assert;
const Db = require('../js/Db');

const helper = require('./_helpers/DbHelper');

describe('Db.js', function () {

    let db;

    before('Initialize Db instance', function() {
        db = new Db(helper.getTestConfig());
    });

    it('#connect()', async function () {
        let conn = await db.connect();
        assert.isNotNull(conn);
        conn.release();
    });

    it('#currentState()', async function() {
        let state = await db.getCurrentState();
        assert.property(state, 'lastBlock');
        assert.isNumber(state.lastBlock, 'currentState[lastBlock] is a number');
    });


    after('Disconnect Db instance', function() {
        db.disconnect();
    });

});