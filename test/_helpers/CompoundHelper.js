


/**

require('dotenv').config({path: '../test.env'});


// const EthHelper = require('./EthHelper');

// const mockDAIJson = require('../../sol/build/MockDAI.json');
// const TruffleConfig = require('../../truffle-config');

const process = require('process');

let config = null;

let CompoundHelper = {
    reset: function () {
        config = null;
    },
    configure: async function () {
        if (config) {
            return config;
        }
        const ethereum = EthHelper.forGanache();
        config = {
            ethereum,
            accountService: process.env.COMPOUND_HTTP_ACCOUNT_SERVICE
        };
        const web3 = ethereum.getWeb3();
        const accounts = await web3.eth.getAccounts();
        const adminAccount = accounts[0];
        const mockDAIContract = new web3.eth.Contract(mockDAIJson.abi);

        const _deployContract = function (contractName, contract, bytecode) {
            return new Promise(function (resolve, reject) {
                contract.deploy({
                    data: bytecode
                }).send({from: adminAccount, gas: TruffleConfig.networks.development.gas})
                    .on('receipt', function (receipt) {
                        config.contracts = config.contracts || {};
                        config.contracts[contractName] = new web3.eth.Contract(contract.options.jsonInterface, receipt.contractAddress);
                        resolve(receipt);
                    })
                    .on('error', function(error) {
                        reject(error);
                    });
            });
        }

        await _deployContract('DAI', mockDAIContract, mockDAIJson.bytecode);
        return config

    },

};

module.exports = CompoundHelper;
*/
