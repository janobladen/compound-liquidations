const BN = require('bn.js');
const _ = require('underscore');

class PriceOracle {

    constructor(config, state) {

        let priceCache = {};
        let isInitialized = false;

        const _init = _.bind(function () {
            if (isInitialized) return;
            isInitialized = true;
            if (!state.ethereum) throw new Error('No ethereum instance in global state.')
            state.ethereum.on('block', function () {
                priceCache = {};
            });

        }, this);


        this.getPriceInWei = async function (symbol) {
            _init();
            if (symbol === 'ETH') return 1e18;
            if (!priceCache[symbol]) {
                let PriceOracle = await state.compound.getContract('PriceOracle');
                let cTokenContract = await state.compound.getContract("c" + symbol);
                let decimals = state.compound.getContractDecimals(symbol);
                let scale = new BN("" + 1e18).div(new BN("" + Math.pow(10, decimals)));
                let price = await PriceOracle.methods.getUnderlyingPrice(cTokenContract.options.address).call();
                let ethPrice = new BN(price).div(scale);
                priceCache[symbol] = ethPrice;
            }
            return priceCache[symbol];
        }

        this.getPriceInEth = async function (symbol) {
            _init();
            if (symbol === 'ETH') return 1.0;
            let web3 = await state.ethereum.getWeb3();
            let wei = await this.getPriceInWei(symbol);
            let eth = web3.utils.fromWei(wei.toString(), 'ether');
            return eth;
        }

        this.convertToEth = async function (fromAmount, fromSymbol) {
            _init();
            let priceInEth = await this.getPriceInEth(fromSymbol);
            let ethAmount = fromAmount * priceInEth;
            return ethAmount;
        }

        this.convertFromEth = async function (ethAmount, toSymbol) {
            _init();
            let priceInEth = await this.getPriceInEth(toSymbol);
            let toAmount = ethAmount / priceInEth;
            return toAmount;
        }

    }


}

module.exports = PriceOracle;