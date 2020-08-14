const LiquidationBot = artifacts.require("LiquidationBot");

const jsonfile = require('jsonfile');

module.exports = function(deployer) {
    const addresses = {
        LiquidationBot: LiquidationBot.address
    };
    console.log('LiquidationBot:\t\t', addresses.LiquidationBot)
    jsonfile.writeFileSync('./test/resources/addresses.json', addresses);
}
