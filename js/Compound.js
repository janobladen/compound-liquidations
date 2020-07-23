const _ = require('underscore');
const superagent = require('superagent');

class Compound {

    constructor(config, state) {
        let markets = config.markets.split(",");

        this.updateBalances = async function (maxHealth, minWorthInEth) {
            const web3 = state.ethereum.getWeb3();

            const requestData = {
                "max_health": {"value": maxHealth},
                "network": state.ethereum.getNetworkName(),
                page_number: 1, page_size: 1000
            };

            if ( maxHealth ) requestData.max_health = { value: ""+maxHealth};
            if ( minWorthInEth ) requestData.min_borrow_value_in_eth = { value: ""+minWorthInEth};

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
            // TODO: Filter accounts by markets (cDAI, cETH etc.)
            return accounts;
        }

    }
}

module.exports = Compound;
