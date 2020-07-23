require('dotenv').config({path: './test.env'});
const process = require('process');

module.exports = {

    db: {
        database: process.env.MYSQL_DATABASE,
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
    },
    ethereum: {
        networkName: 'ganache',
        uri: process.env.ETH_GANACHE_URI,
        gasLimit: process.env.ETH_GANACHE_GAS_LIMIT,
        gasPrice: process.env.ETH_GANACHE_GAS_PRICE
    },
    compound: {
        accountService: process.env.COMPOUND_HTTP_ACCOUNT_SERVICE,
        markets: process.env.COMPOUND_MARKETS
    }

};