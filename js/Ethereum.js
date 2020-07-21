
const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = Ethereum;

Ethereum.prototype.constructor = Ethereum;

function Ethereum(networkName, config) {

    this.networkName = networkName;

    if ( networkName === 'ganache' ) {
        let ganacheUri = config.uri || 'http://127.0.0.1:8545';
        this.web3 = new Web3(ganacheUri);
    } else {
        let mnemonic = config.mnemonic;
        if (!mnemonic) throw new Error('config.mnemonic not defined.');
        let networkUri = config.uri;
        if (!networkUri) throw new Error('config.uri not defined.');
        this.web3 = new Web3(new HDWalletProvider(mnemonic, networkUri));
    }

}

Ethereum.prototype.getNetworkName = function() {
    return this.networkName;
}

Ethereum.prototype.getWeb3 = function() {
    return this.web3;
}
