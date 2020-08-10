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
        mainnet: {
            networkName: 'mainnet',
            uri: process.env.ETH_MAINNET_URI,
            gasLimit: process.env.ETH_MAINNET_GAS_LIMIT,
            gasPrice: process.env.ETH_MAINNET_MNEMONIC
        },
        forked: {
            networkName: 'mainnet',
            uri: process.env.ETH_FORKED_MAINNET_URI,
            gasLimit: process.env.ETH_FORKED_MAINNET_GAS_LIMIT,
            gasPrice: process.env.ETH_FORKED_MAINNET_MNEMONIC
        }
    },
    compound: {
        accountService: process.env.COMPOUND_HTTP_ACCOUNT_SERVICE,
        accountServiceBlock: process.env.COMPOUND_HTTP_ACCOUNT_SERVICE_BLOCK
    },
    ganache: {
        uri: process.env.ETH_FORKED_MAINNET_URI,
        forkUri: process.env.ETH_FORKED_MAINNET_FORK_URI,
        mnemonic: process.env.ETH_FORKED_MAINNET_MNEMONIC
    }

};