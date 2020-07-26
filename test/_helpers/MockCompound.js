require('dotenv').config({path: './test.env'});

const _ = require('underscore');
const express = require('express');
const jsonfile = require('jsonfile');
const Promise = require('bluebird');
const URI = require('uri-js');

const TestConfig = require('./TestConfig');
const TestState = require('./TestState');
const TruffleHelper = require('./TruffleHelper');

class MockCompound {

    constructor() {

        const app = _createAPI();

        this.init = async function () {
            let serviceUri = URI.parse(TestConfig.compound.accountService);
            let {port} = serviceUri;

            let ethereum = (await TestState.get()).ethereum;
            await _deployContracts(ethereum);
            app.listen(port);
        }


        this.end = function () {
            app.end();
        }
    }


}

let instance = null;
MockCompound.get = async function () {
    if (!instance) {
        instance = new MockCompound();
        await instance.init();
    }
    return instance;
}

async function _deployContracts(ethereum) {
    await TruffleHelper.compile();
    const web3 = ethereum.getWeb3();
    const contractNames = ['CETH', 'CDAI'];
    const accounts = await web3.eth.getAccounts();
    const adminAccount = accounts[0];

    const addresses = {};
    const deploys = _.map(contractNames, function (contractName) {
        return new Promise(async function (resolve, reject) {
            const contractJson = await jsonfile.readFile('./sol/build/Mock' + contractName + '.json');
            const deployContract = new web3.eth.Contract(contractJson.abi);
            deployContract.deploy({data: contractJson.bytecode})
                .send({
                    from: adminAccount,
                    gasPrice: TestConfig.ethereum.gasPrice,
                    gas: TestConfig.ethereum.gasLimit
                })
                .on('error', function (error) {
                    reject(new Error('Unable to deploy contract ' + contractName + ": " + error));
                }).on('receipt', function (receipt) {
                resolve([contractName, receipt.contractAddress]);
            });
        });
    });
    let results = await Promise.all(deploys);
    results = _.object(results);
    await jsonfile.writeFile("./resources/compound/addresses.ganache.json", results);
    return results;
}

function _createAPI() {
    let app = express();
    app.use(express.json())

    const allAccounts = jsonfile.readFileSync('./test/resources/compound.accountService.json');
    app.post('/api/v2/account', function (req, res) {
        /* {
             "addresses": [] // returns all accounts if empty or not included
             "block_number": 0 // returns latest if given 0
             "max_health": { "value": "10.0" }
             "min_borrow_value_in_eth": { "value": "0.002" }
             "page_number": 1
             "page_size": 10
         }*/
        let accounts = allAccounts;
        if (req.body.addresses) {
            accounts = _.filter(accounts, account => {
                return _.contains(req.body.addresses, account.address);
            });
        }

        if (req.body.max_health && req.body.max_health.value) {
            const max = Number.parseFloat(req.body.max_health.value);
            accounts = _.filter(accounts, account => {
                let [whole, fraction] = account.health.value.split('.');
                fraction = fraction.substr(0, 9);
                const health = Number.parseFloat(whole + "." + fraction);
                return health <= max;
            });
        }

        if (req.body.min_borrow_value_in_eth && req.body.min_borrow_value_in_eth.value) {
            const min = Number.parseFloat(req.body.min_borrow_value_in_eth.value);
            accounts = _.filter(accounts, account => {
                let [whole, fraction] = account.total_borrow_value_in_eth.value.split('.');
                fraction = fraction.substr(0, 9);
                const worth = Number.parseFloat(whole + "." + fraction);
                return worth >= min;
            });
        }

        const page_size = req.body.page_size || 10;
        const page_number = req.body.page_number || 1;
        const total_entries = accounts.length;
        const total_pages = Math.ceil(total_entries / page_size);
        const idx = (page_number - 1) * page_size;
        accounts = _.rest(accounts, idx);
        accounts = _.first(accounts, page_size);
        const pagination_summary = {
            page_size: accounts.length, page_number, total_entries, total_pages
        };

        res.send({accounts, pagination_summary});
    });
    return app;

}

module.exports = MockCompound;