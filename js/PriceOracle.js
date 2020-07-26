const superagent = require('superagent');


class PriceOracle {

    constructor(config) {

        const coinIds = {
            BAT: 'basic-attention-token',
            DAI: 'dai',
            ETH: 'eth',
            REP: 'augur',
            SAI: 'sai',
            USDC: 'usd-coin',
            USDT: 'tether',
            WBTC: 'wrapped-bitcoin',
            ZRX: '0x',
        }

        this.getPriceInEth = async function(symbol) {
            let coinId = coinIds[symbol];
            if (!coinId) throw new Error('Unknown symbol: ' + symbol);
            if (coinId === 'eth') return 1.0;
            let uri = config.uri.replace('{from}', coinId).replace('{to}', coinIds['ETH']);
            let res;
            try {
                res = await superagent.get(uri);
            } catch(error) {
                throw new Error('Price oracle failure: ' +  error);
            }
            let price = res.body[coinId].eth;
            if (!price) throw new Error('Price oracle unreliable: price=' + price);
            return price;
        }

    }



}

module.exports = PriceOracle;