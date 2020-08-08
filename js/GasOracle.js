const _ = require('underscore');
const superagent = require('superagent');

class GasOracle {

    constructor(config) {

        const uri = config.uri;

        let gasPrices = {};
        let cacheInvalidator = setInterval(_.bind(function () {
            this._clearCache();
        }, this), 60 /* secs */ * 60000);

        this._fetchGasOracle = async function () {
            try {
                let response = await superagent.get(uri).set('Accept', 'application/json; charset=utf-8');
                return response.body;
            } catch (error) {
                throw new Error('Gas oracle error: ' + error);
            }
        };

        this.getGasPrices = async function () {
            if (!_.has(gasPrices, 'standard')) {
                gasPrices = await this._fetchGasOracle();
                if (!gasPrices.standard) throw new Error('Gas oracle unreliable: standard=' + gasPrices.standard);
            }
            return gasPrices;
        };

        this._clearCache = function() {
            gasPrices = {};
        };

        this.end = function() {
            if (cacheInvalidator) clearInterval(cacheInvalidator);
            cacheInvalidator = null;
        }


    }
}

module.exports = GasOracle;
