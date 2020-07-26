const _ = require('underscore');
const BN = require('bn.js');
const jsonfile = require('jsonfile');
const Promise = require('bluebird');
const superagent = require('superagent');

const symbols = ['cBAT', 'cDAI', 'cETH', 'cREP', 'cSAI', 'cUSDC', 'cUSDT', 'cWBTC', 'cZRX'];
const contractNames = _.union(symbols,
    ["Comptroller"],
    _.map(symbols, function (symbol) {
        return symbol.substr(1)
    }));
const decimals = {};

class Compound {

    constructor(config, state) {
        let markets = config.markets.split(",");
        let contracts = null;

        this.listAccounts = async function ({borrowerAccounts, maxHealth, minWorthInEth}) {
            const requestData = {
                "network": state.ethereum.getNetworkName(),
                page_number: 1, page_size: 1000
            };

            if (maxHealth) requestData.max_health = {value: "" + maxHealth};
            if (minWorthInEth) requestData.min_borrow_value_in_eth = {value: "" + minWorthInEth};
            if (borrowerAccounts && borrowerAccounts.length) requestData.addresses = borrowerAccounts;

            let accounts = [];
            while (true) {
                let result = await superagent.post(config.accountService)
                    .set('Content-Type', 'application/json')
                    .set('Accept', 'application/json')
                    .send(requestData);
                if (!result.body.error) {
                    accounts = accounts.concat(result.body.accounts);
                    let {total_pages} = result.body.pagination_summary;
                    if (accounts.length === 0 || requestData.page_number === total_pages) break;
                    requestData.page_number++;
                } else {
                    throw new Error(result.body.error);
                }
            }
            accounts = _.filter(accounts, function (account) {
                return _.reduce(account.tokens, function (memo, token) {
                    if (memo === true) return true;
                    return _.contains(markets, token.symbol.toUpperCase())
                }, false);
            });
            return accounts;
        }

        this.updateCTokens = async function () {
            const requestData = {
                "addresses": [],
                "block_timestamp": 0,
                meta: false,
                "network": state.ethereum.getNetworkName()
            };

            let result = await superagent.post("https://api.compound.finance/api/v2/ctoken")
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .send(requestData);
            if (!result.body.error) {

                return _.reduce(result.body.cToken, function (memo, ctoken) {
                    memo[ctoken.symbol] = {
                        exchangeRate: Compound.parseNumber(ctoken.exchange_rate.value)
                    }
                    return memo;
                }, {});
            } else {
                if (state.log) state.log.error('Unable to load cToken stats: %s', res.body.error);
            }
        }

        this.getSymbols = function () {
            return _.union(symbols);
        }

        this.getContactNames = function () {
            return _.union(contractNames);
        }

        this.getContracts = async function () {
            if (!contracts) {
                const web3 = await state.ethereum.getWeb3();
                const networkName = state.ethereum.getNetworkName();
                const addresses = await jsonfile.readFile('./resources/compound/addresses.' + networkName + '.json');
                contracts = await Promise.all(Promise.map(contractNames, async function (contractName) {
                    if (contractName === 'ETH') return ["ETH", null];
                    const abi = await jsonfile.readFile('./resources/compound/abi.' + contractName + '.json');
                    return [contractName, new web3.eth.Contract(abi, addresses[contractName])];
                }));

                contracts = _.object(contracts);
                delete contracts.ETH;
            }
            return contracts;
        }

        this.getContract = async function (contractName) {
            const _contracts = await this.getContracts();
            if (!_contracts[contractName]) throw new Error('Unknown contract: ' + contractName);
            return _contracts[contractName];
        }

        this.getComptroller = async function () {
            return this.getContract('Comptroller');
        }

        this.getUnderlying = function (symbol) {
            return symbol.substr(1);
        }

        this.getContractDecimals = async function(contractName) {
            if (contractName === 'ETH') return 18;
            if (!decimals[contractName]) {
                switch (contractName) {
                    case 'USDC':
                        decimals[contractName] = 6;
                        break;
                    default:
                        let contract = await this.getContract(contractName);
                        decimals[contractName] = await contract.methods.decimals().call();
                }
            }
            return decimals[contractName];
        }

        this.formatBN = async function(contractName, bn, precision) {
            if (!precision) precision = 4;
            let contractDecimals = await this.getContractDecimals(contractName);
            let numberStr = bn.toString();
            while (numberStr.length < contractDecimals) numberStr = "0" + numberStr;
            let fraction = numberStr.slice(-contractDecimals);
            fraction = fraction.substr(0, precision);
            let whole = "0";
            if (numberStr.length > contractDecimals) {
                whole = numberStr.substr(0,numberStr.length-contractDecimals);
            }
            return whole + "." + fraction;
        }

        this.getBalanceSheetForAccount = async function (accountAddress) {
            let balanceSheet = {
                borrows: {},
                collaterals: {}
            };

            const comptroller = await this.getComptroller();
            let accountMarketsIn;
            try {
                accountMarketsIn = await comptroller.methods.getAssetsIn(accountAddress).call();
            } catch (error) {
                console.log(error);
                return balanceSheet;
            }

            let accountMarketSymbols = await Promise.filter(_.keys(contracts), _.bind(async function (symbol) {
                const contract = await this.getContract(symbol);
                return _.contains(accountMarketsIn, contract.options.address);
            }, this));

            await Promise.all(Promise.map(accountMarketSymbols, _.bind(async function (symbol) {
                let cTokenContract = await this.getContract(symbol);
                let amount = new BN(await cTokenContract.methods.borrowBalanceCurrent(accountAddress).call());
                if (amount.gtn(0)) balanceSheet.borrows[symbol] = amount;
                amount = new BN(await cTokenContract.methods.balanceOfUnderlying(accountAddress).call());
                if (amount.gtn(0)) balanceSheet.collaterals[symbol] = amount;
            }, this)));
            return balanceSheet;
        };

        this.highestAssetOf = async function (symbolValuePairs) {
            let valuesinEth = await Promise.map(_.keys(symbolValuePairs), async function (symbol) {
                const underlyingSymbol = symbol.substr(1);
                let ethPrice = Math.floor((await state.priceOracle.getPriceInEth(underlyingSymbol)) * 10e6);
                ethPrice = new BN(ethPrice + "");
                let ethValue = symbolValuePairs[symbol].mul(ethPrice).div(new BN("" + 10e6));
                return [symbol, ethValue];
            });
            let highestValue = _.reduce(valuesinEth, function (memo, value) {
                if (memo[1].gt(value[1])) return memo;
                return value;
            }, ['', new BN(0)]);
            return {
                symbol: highestValue[0],
                valueInEth: highestValue[1]
            };
        };

        this.getCloseFactor = async function() {
            const comptroller = await this.getComptroller();
            return new BN(await comptroller.methods.closeFactorMantissa().call());
        }

        this.getLiquidationIncentive = async function() {
            const comptroller = await this.getComptroller();
            return new BN(await comptroller.methods.liquidationIncentiveMantissa().call());
        }
    }

}

Compound.parseNumber = function (str, decimals) {
    if (decimals === null || decimals === undefined) decimals = 9;
    str = str || "0.0";
    let [whole, fraction] = str.toString().split('.');
    fraction = fraction || "0";
    return Number.parseFloat(whole + "." + fraction.substr(0, decimals));
}

module.exports = Compound;
