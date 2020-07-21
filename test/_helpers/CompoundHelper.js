require('dotenv').config({path: '../test.env'});

const process = require('process');

function getConfig() {
    return {
        accountService: process.env.COMPOUND_HTTP_ACCOUNT_SERVICE
    };
}

let CompoundHelper = {getConfig};

module.exports = CompoundHelper;

