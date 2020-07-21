require('dotenv').config({path: '../test.env'});

const Db = require('../../js/Db');
const process = require('process');

function getTestConfig() {
    return {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT || '3306',
        user: process.env.MYSQL_USER || 'mysql',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || '',
    };
}

DbHelper = {

    getTestConfig: getTestConfig,
    getTestDb: () => {
        return new Db(getTestConfig());
    }



};

module.exports = DbHelper;

