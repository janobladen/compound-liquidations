const EventEmitter = require('events').EventEmitter;
const _ = require('underscore');

const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

class Ethereum extends EventEmitter {

    constructor(config, state) {
        super();

        const networkName = config.networkName;
        if (!config.uri) throw new Error('config.uri not defined.');

        let isInitialized = false;

        // Create web3 instance
        let web3;
        let web3Provider;

        async function init() {
            if (isInitialized) return;
            if (config.privateKey) {
                web3Provider = new HDWalletProvider(config.privateKey, config.uri);
                web3 = new Web3(web3Provider);
            } else {
                web3Provider = new Web3.providers.WebsocketProvider(config.uri);
                web3 = new Web3(web3Provider);
            }
            web3Provider.on('close', function () {
                if (web3Provider && web3Provider.end ) web3Provider.end();
                isInitialized = false;
            });
            isInitialized = true;
            // Subscribe to new block headers and emit 'block' events.
            web3.eth.subscribe('newBlockHeaders').on('data', _.bind(function (blockData) {
                this.emit('block', blockData);
            }, this));
        }


        // Methods
        this.getWeb3 = async function () {
            await init.apply(this);
            return web3;
        }

        this.getNetworkName = function () {
            return networkName;
        }

        this.getBlockNumber = async function () {
            await init.apply(this);
            return web3.eth.getBlockNumber();
        }

        this.getAccounts = async function () {
            await init.apply(this);
            return web3.eth.getAccounts();
        }


    }
}

module.exports = Ethereum;
