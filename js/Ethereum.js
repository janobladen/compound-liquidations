const EventEmitter = require('events').EventEmitter;
const _ = require('underscore');

const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

class Ethereum extends EventEmitter {

    constructor(config) {
        super();

        const networkName = config.networkName;

        // Create web3 instance
        let web3;
        if (networkName === 'ganache') {
            let ganacheUri = config.uri || 'http://127.0.0.1:8545';
            web3 = new Web3(ganacheUri);
        } else {
            if (!config.mnemonic) throw new Error('config.mnemonic not defined.');
            if (!config.uri) throw new Error('config.uri not defined.');
            web3 = new Web3(new HDWalletProvider(config.mnemonic, config.uri));
        }

        // Subscribe to new block headers and emit 'block' events.
        web3.eth.subscribe('newBlockHeaders')
            .on('data', _.bind(function (blockData) {
                this.emit('block', blockData);
            }, this));

        // Methods
        this.getWeb3 = function () {
            return web3;
        }

        this.getNetworkName = function () {
            return networkName;
        }

        this.getBlockNumber = async function () {
            return web3.eth.getBlockNumber();
        }


    }
}

module.exports = Ethereum;
