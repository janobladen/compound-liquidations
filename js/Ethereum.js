const EventEmitter = require('events').EventEmitter;
const _ = require('underscore');

const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

class Ethereum extends EventEmitter {

    constructor(config, state) {
        super();

        const networkName = config.networkName;

        // Create web3 instance
        let web3;
        if (networkName === 'ganache') {
            let ganacheUri = config.uri || 'http://127.0.0.1:8545';
            web3 = new Web3(ganacheUri);
        } else {
            if (!config.uri) throw new Error('config.uri not defined.');
            if (config.privateKey) {
                let provider = new HDWalletProvider(config.privateKey, config.uri);
                web3 = new Web3(provider);
            } else {
                web3 = new Web3(new Web3.providers.WebsocketProvider(config.uri));
            }
        }

        let isInitialized = false;
        async function init() {
            if (isInitialized) return;
            isInitialized = true;
            await web3.eth.getAccounts();
        }

        // Subscribe to new block headers and emit 'block' events.
        web3.eth.subscribe('newBlockHeaders').on('data', _.bind(function (blockData) {
            this.emit('block', blockData);
        }, this));

        // Methods
        this.getWeb3 = async function () {
            await init();
            return web3;
        }

        this.getNetworkName = function () {
            return networkName;
        }

        this.getBlockNumber = async function () {
            await init();
            return web3.eth.getBlockNumber();
        }

        this.getAccounts = async function() {
            await init();
            return web3.eth.getAccounts();
        }


    }
}

module.exports = Ethereum;
