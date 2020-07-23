const assert = require('chai').assert;

const TestState =  require('./_helpers/TestState');
const Db = require('../js/Db');

describe('Db.js', function () {

    let db;

    before('#constructor', function() {
        db = TestState.get().db;
    });

    it('#connect()', async function () {
        let conn = await db.connect();
        assert.isNotNull(conn);
        db.disconnect(conn);
    });

});