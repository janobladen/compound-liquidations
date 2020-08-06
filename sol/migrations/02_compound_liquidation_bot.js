var contract = artifacts.require("CompoundLiquidationBot");

module.exports = function(deployer) {
    // deployment steps
    deployer.deploy(contract);
};
