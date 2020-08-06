const _ = require('underscore');
const BN = require('bn.js');
const jsonfile = require('jsonfile');
const Promise = require('bluebird');
const superagent = require('superagent');

const symbols = ['cBAT', 'cDAI', 'cETH', 'cREP', 'cSAI', 'cUSDC', 'cUSDT', 'cWBTC', 'cZRX'];
const contractNames = _.union(symbols,
    ["Comptroller", "PriceOracle"],
    _.map(symbols, function (symbol) {
        return symbol.substr(1)
    }));
const decimals = {};

class Compound {

    constructor(config, state) {
        let contracts = null;

        this._fetchAccountService = async function ({borrowerAccounts, minWorthInEth}) {
            let networkName = state.ethereum.getNetworkName();
            const requestData = {
                "network": networkName === 'ganache' ? 'mainnet' : networkName,
                page_number: 1, page_size: 1000,
                block_number: config.accountServiceBlock ? config.accountServiceBlock : 0
            };

            requestData.max_health = {value: "1.0"};
            if (minWorthInEth) requestData.min_borrow_value_in_eth = {value: "" + minWorthInEth};
            if (borrowerAccounts && borrowerAccounts.length) requestData.addresses = borrowerAccounts;

            let accounts = [];
            let error;
            while (!error) {
                let result;
                try {
                    result = await superagent.get(config.accountService)
                        .set('Accept', 'application/json')
                        .query(requestData);
                } catch (e) {
                    throw new Error("Error calling from compound API: " + e);
                }
                if (!result.body.error) {
                    accounts = accounts.concat(result.body.accounts);
                    let {total_pages} = result.body.pagination_summary;
                    if (accounts.length === 0 || requestData.page_number === total_pages) break;
                    requestData.page_number++;
                } else {
                    error = result.body.error;
                    throw new Error("Error return from compound API: " + error);
                }
            }
            return accounts;
        };

        this.listAccounts = async function ({borrowerAccounts, minWorthInEth, maxResults}) {
            let accounts = await this._fetchAccountService({borrowerAccounts, minWorthInEth});
            accounts = _.chain(accounts)
                .map(account => {
                    return {
                        address: account.address,
                        borrowValue: Compound.parseNumber(account.total_borrow_value_in_eth.value, 4)
                    }
                })
                .sortBy(account => -account.borrowValue)
                .first(maxResults ? maxResults : 10)
                .value();
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

        this.getContractDecimals = function (contractName) {
            if (!decimals[contractName]) {
                switch (contractName) {
                    case 'cBAT':
                    case 'cDAI':
                    case 'cETH':
                    case 'cREP':
                    case 'cSAI':
                    case 'cUSDC':
                    case 'cUSDT':
                    case 'cWBTC':
                    case 'cZRX':
                        decimals[contractName] = 8;
                        break;
                    case 'BAT':
                    case 'ETH':
                    case 'DAI':
                    case 'REP':
                    case 'SAI':
                    case 'ZRX':
                        decimals[contractName] = 18;
                        break;
                    case 'USDC':
                    case 'USDT':
                        decimals[contractName] = 6;
                        break;
                    case 'WBTC':
                        decimals[contractName] = 8;
                        break;
                    default:
                        throw new Error('Unknown contract ' + contractName);
                }
            }
            return decimals[contractName];
        }

        this.formatBN = function (contractName, bn, precision) {
            let contractDecimals = this.getContractDecimals(contractName);
            return Compound.formatBN(bn, contractDecimals, precision);
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
                let amount = await cTokenContract.methods.borrowBalanceCurrent(accountAddress).call();
                amount = new BN(amount);
                if (amount.gtn(0)) balanceSheet.borrows[symbol] = amount;
                amount = await cTokenContract.methods.balanceOfUnderlying(accountAddress).call();
                amount = new BN(amount);
                if (amount.gtn(0)) balanceSheet.collaterals[symbol] = amount;
            }, this)));
            return balanceSheet;
        };

        this.highestAssetOf = async function (symbolValuePairs) {
            let _this = this;
            let valuesInEth = await Promise.map(_.keys(symbolValuePairs), async function (symbol) {
                const underlyingAmount = symbolValuePairs[symbol];
                const underlyingSymbol = symbol.substr(1);
                const ethAmount = await _this.convertUnderlyingToEth(underlyingAmount, underlyingSymbol);
                return [symbol, ethAmount];
            });
            let highestValue = _.reduce(valuesInEth, function (memo, value) {
                if (memo[1].gt(value[1])) return memo;
                return value;
            }, ['', new BN(0)]);
            return {
                symbol: highestValue[0],
                valueInEth: highestValue[1]
            };
        };

        this.getCloseFactor = async function () {
            const comptroller = await this.getComptroller();
            return new BN(await comptroller.methods.closeFactorMantissa().call());
        }

        this.getLiquidationIncentive = async function () {
            const comptroller = await this.getComptroller();
            return new BN(await comptroller.methods.liquidationIncentiveMantissa().call());
        }

        this.convertEthToUnderlying = async function (amountInEth, underlyingSymbol) {
            let scale = new BN("" + 1e6);
            let ethScale = new BN("" + 1e18);
            let ethAmount = amountInEth.mul(scale).div(ethScale);
            ethAmount = Number(ethAmount.toString()) / 1e6;
            let underlyingAmount = await state.priceOracle.convertFromEth(ethAmount, underlyingSymbol);
            underlyingAmount = Math.floor(underlyingAmount * 1e6);
            underlyingAmount = new BN("" + underlyingAmount);
            let underlyingScale = new BN("10").pow(new BN("" + state.compound.getContractDecimals(underlyingSymbol)));
            underlyingAmount = underlyingAmount.mul(underlyingScale).div(new BN("" + 1e6));
            return underlyingAmount;
        }

        this.convertUnderlyingToEth = async function (amountInUnderlying, underlyingSymbol) {
            let scale = new BN("" + 1e6);
            let underlyingScale = new BN("10").pow(new BN("" + state.compound.getContractDecimals(underlyingSymbol)));
            let underlyingAmount = amountInUnderlying.mul(scale).div(underlyingScale);
            underlyingAmount = Number(underlyingAmount.toString()) / 1e6;
            let ethAmount = await state.priceOracle.convertToEth(underlyingAmount, underlyingSymbol);
            ethAmount = Math.floor(ethAmount * 1e6);
            ethAmount = new BN("" + ethAmount);
            let ethScale = new BN("" + 1e18);
            ethAmount = ethAmount.mul(ethScale).div(new BN("" + 1e6));
            return ethAmount;
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

Compound.formatBN = function (bn, decimals, precision) {
    if (!precision) precision = 4;
    let numberStr = bn.toString();
    while (numberStr.length < decimals) numberStr = "0" + numberStr;
    let fraction = numberStr.slice(-decimals);
    fraction = fraction.substr(0, precision);
    let whole = "0";
    if (numberStr.length > decimals) {
        whole = numberStr.substr(0, numberStr.length - decimals);
    }
    return whole + "." + fraction;
}


module.exports = Compound;
