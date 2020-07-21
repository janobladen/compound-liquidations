require('dotenv').config({path: '../test.env'});

const Ethereum = require('../../js/Ethereum');
const process = require('process');

function getRinkebyConfig() {
    return {
        mnemonic: process.env.ETH_RINKEBY_MNEMONIC,
        uri: process.env.ETH_RINKEBY_URI
    };
}

EthHelper = {

    getRinkebyConfig: getRinkebyConfig,

    forRinkeby: () => {
        return new Ethereum('rinkeby', getRinkebyConfig());
    }

};

module.exports = EthHelper;

