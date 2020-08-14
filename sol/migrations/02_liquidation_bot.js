var contract = artifacts.require("LiquidationBot");

module.exports = function(deployer) {
    // deployment steps
    deployer.deploy(contract);
};
