require('dotenv').config({path: './run.env'});

const {program} = require('commander');

const _ = require('underscore');
const BN = require('bn.js');
const chalk = require('chalk');
const cliui = require('cliui');
const Promise = require('bluebird');

const Ethereum = require('./js/Ethereum');
const Compound = require('./js/Compound');
const PriceOracle = require('./js/PriceOracle');

const config = {

    ethereum: {
        networkName: 'mainnet',
        uri: process.env.ETH_MAINNET_URI,
        mnemonic: process.env.ETH_MAINNET_MNEMONIC,
        gasLimit: process.env.ETH_MAINNET_GAS_LIMIT,
        gasPrice: process.env.ETH_MAINNET_GAS_PRICE,
        privateKey: process.env.ETH_MAINNET_PRIVATE_KEY
    },
    compound: {
        accountService: process.env.COMPOUND_HTTP_ACCOUNT_SERVICE,
        markets: process.env.COMPOUND_MARKETS
    },
    priceOracle: {
        uri: process.env.PRICE_ORACLE_URI
    }

};

const state = {};
state.ethereum = new Ethereum(config.ethereum, state);
state.compound = new Compound(config.compound, state);
state.priceOracle = new PriceOracle(config.priceOracle);

console.log(chalk.green('Running on mainnet.'));

program.command('help', {isDefault: true})
    .action(function () {
        console.log(program.help());
        process.exit(0);
    });

program.command('list')
    .description('Lists all accounts ready for liquidation')
    .action(async function () {
        /*let block = await state.ethereum.getBlockNumber();
        console.log(chalk.red("Block:" + block));*/
        let accounts = await state.compound.listAccounts({maxHealth: 1.0, minWorthInEth: 0.5});
        accounts.forEach(function (account) {
            let accountDetails = {
                collaterals: [],
                borrows: [],
                borrowInterest: {}
            };
            let collaterals = [];
            let borrows = [];
            let supplyInterests = {};
            let borrowInterests = {};
            account.tokens.forEach(function (token) {
                let collateralUnderlying = Compound.parseNumber(token.supply_balance_underlying.value, 4);
                if (collateralUnderlying > 0) collaterals.push({value: collateralUnderlying, symbol: token.symbol});
                let borrowUnderlying = Compound.parseNumber(token.borrow_balance_underlying.value, 4);
                if (borrowUnderlying > 0) borrows.push({value: borrowUnderlying, symbol: token.symbol});
                let supplyInterest = Compound.parseNumber(token.lifetime_supply_interest_accrued.value, 4);
                if (supplyInterest > 0) supplyInterests[token.symbol] = supplyInterest;
                let borrowInterest = Compound.parseNumber(token.lifetime_borrow_interest_accrued.value, 4);
                if (borrowInterest > 0) borrowInterests[token.symbol] = borrowInterest;
            });

            let ui = cliui({wrap: false});
            ui.div({
                    text: "Account: " + chalk.green.underline(account.address),
                    width: 12,
                    padding: [1, 0, 0, 0],
                    border: false
                },
            );
            let rows = Math.max(collaterals.length, borrows.length);
            ui.div({
                    text: chalk.underline("Collaterals"),
                    width: 18,
                    padding: [1, 2, 0, 1]
                }, {
                    text: "(Interest)",
                    width: 18,
                    padding: [1, 2, 0, 0]
                },
                {
                    text: chalk.underline("Borrows"),
                    width: 18,
                    padding: [1, 2, 0, 0]
                },
                {
                    text: "(Interest)",
                    width: 18,
                    padding: [1, 2, 0, 0]
                },);
            for (let row = 0; row < rows; row++) {
                let collateral = collaterals[row];
                let borrow = borrows[row];
                let supplyInterest = collateral ? supplyInterests[collateral.symbol] : null;
                let borrowInterest = borrow ? borrowInterests[borrow.symbol] : null;
                ui.div({
                        text: collateral ? collateral.symbol + " " + collateral.value : "",
                        align: 'right',
                        width: 18,
                        padding: [0, 2, 0, 1]
                    },
                    {
                        text: supplyInterest ? "+" + supplyInterest : "",
                        align: 'right',
                        width: 18,
                        padding: [0, 2, 0, 1]
                    },
                    {
                        text: borrow ? borrow.symbol + " " + borrow.value : "",
                        align: 'right',
                        width: 18,
                        padding: [0, 2, 0, 0]
                    },
                    {
                        text: borrowInterest ? "+" + borrowInterest : "",
                        align: 'right',
                        width: 18,
                        padding: [0, 2, 0, 1]
                    },
                );
            }
            ui.div("");
            console.log(ui.toString());
        });
        process.exit(0);
    });

program.command('liquidate <address>')
    .description('Liquidates assets for a specific address')
    .action(async function (borrowerAddress) {
        let ui = cliui({wrap: false});

        ui.div({
            text: "Account: " + chalk.green.underline(borrowerAddress),
            padding: [0, 0, 1, 0]
        });

        const comptroller = await state.compound.getContract('Comptroller');
        const adminAccount = await (state.ethereum.getAccounts())[0];

        let balanceSheet = await state.compound.getBalanceSheetForAccount(borrowerAddress);
        ui.div({
            text: "Collateral: ",
            width: 18,
            padding: [0, 0, 0, 1],
            border: false
        }, {
            text: _.reduce(_.keys(balanceSheet.collaterals), function (memo, symbol) {
                memo = memo + symbol
                memo += ": ";
                memo += ("" + Compound.parseNumber(balanceSheet.collaterals[symbol] / 1e18, 4));
                memo += " ";
                return memo;
            }, ""),
            align: 'right',
            width: 40,
            padding: [0, 0, 0, 0],
            border: false
        });
        ui.div({
            text: "Borrowed: ",
            width: 18,
            padding: [0, 0, 0, 1],
            border: false
        }, {
            text: _.reduce(_.keys(balanceSheet.borrows), function (memo, symbol) {
                memo = memo + symbol
                memo += ": ";
                memo += ("" + Compound.parseNumber(balanceSheet.borrows[symbol] / 1e18, 4));
                memo += " ";
                return memo;
            }, ""),
            align: 'right',
            width: 40,
            padding: [0, 0, 0, 0],
            border: false
        });

        const web3 = await state.ethereum.getWeb3();

        let bestBorrow = await state.compound.highestAssetOf(balanceSheet.borrows);
        ui.div({
            text: 'Best borrowed asset: ' + bestBorrow.symbol + " (Value: " + Compound.parseNumber(web3.utils.fromWei(bestBorrow.valueInEth, 'ether'), 4) + " ETH)",
            padding: [1, 0, 0, 1],
            width: 40
        });
        let bestCollateral = await state.compound.highestAssetOf(balanceSheet.collaterals);
        ui.div({
            text: 'Best collateral asset: ' + bestCollateral.symbol + " (Value: " + Compound.parseNumber(web3.utils.fromWei(bestCollateral.valueInEth, 'ether'), 4) + " ETH)",
            padding: [0, 0, 0, 1],
            width: 40
        });

        let closeFactor = await state.compound.getCloseFactor();
        ui.div({
            text: 'Close factor: ' + Compound.parseNumber(closeFactor.toString() / 1e18, 2),
            padding: [0, 0, 0, 1],
            width: 40
        });


        // Determine borrowed asset value.
        let closeSymbol = bestBorrow.symbol;
        let closeAmount = balanceSheet.borrows[closeSymbol];
        let closeAmountInEth = bestBorrow.valueInEth;
        let closeUnderlyingSymbol = state.compound.getUnderlying(closeSymbol);
        let scale = new BN(Number(1e18).toString());
        closeAmount = closeAmount.mul(closeFactor).div(scale);
        closeAmountInEth = closeAmountInEth.mul(closeFactor).div(scale);

        // Determine available collateral value.
        let rewardSymbol = bestCollateral.symbol;
        let rewardAmount = balanceSheet.collaterals[rewardSymbol];
        let rewardAmountInEth = bestCollateral.valueInEth;
        let rewardUnderlyingSymbol = state.compound.getUnderlying(rewardSymbol);
        scale = new BN(Number(1e18).toString());
        rewardAmount = rewardAmount.mul(closeFactor).div(scale);
        rewardAmountInEth = rewardAmountInEth.mul(closeFactor).div(scale);

        if (rewardAmountInEth.lt(closeAmountInEth)) {
            // Not enough collateral for entire liquidation, adjust closeAmount accordingly.
            ui.div({
                text: "=> Adjusting liquidation amount to available reward.",
                padding: [0, 0, 0, 2]
            });
            closeAmountInEth = rewardAmountInEth;
            let conversionRate = await state.priceOracle.getPriceInEth(closeUnderlyingSymbol);
            conversionRate = Math.round(conversionRate * 10e6);
            let conversionRateScaled = new BN("" + conversionRate);
            let scale = new BN("" + 10e6);
            closeAmount = rewardAmountInEth.div(conversionRateScaled).mul(scale);
        } else {
            // Not enough reward for entire liquidation, adjust rewardAmount accordingly.
            ui.div({
                text: "=> Adjusting reward to liquidation amount.",
                padding: [0, 0, 0, 2]
            });
            rewardAmountInEth = closeAmountInEth;
            let conversionRate = await state.priceOracle.getPriceInEth(rewardUnderlyingSymbol);
            conversionRate = Math.round(conversionRate * 10e6);
            let conversionRateScaled = new BN("" + conversionRate);
            let scale = new BN("" + 10e6);
            rewardAmount = closeAmountInEth.div(conversionRateScaled).mul(scale);
        }

        let closeAmountFormatted = await state.compound.formatBN(closeUnderlyingSymbol, closeAmount);
        let closeAmountInEthFormatted = await state.compound.formatBN('ETH', closeAmountInEth);
        let rewardAmountFormatted = await state.compound.formatBN(rewardUnderlyingSymbol, rewardAmount);
        let rewardAmountInEthFormatted = await state.compound.formatBN('ETH', rewardAmountInEth);
        ui.div({
            text: "=> Max. amount for liquidation: "
                + closeAmountFormatted + " " + closeUnderlyingSymbol
                + (closeUnderlyingSymbol === 'ETH' ? "" : " (" + closeAmountInEthFormatted + " ETH)"),
            padding: [0, 0, 0, 2],
            width: 40
        });

        ui.div({
            text: "=> Max. reward: "
                + rewardAmountFormatted + " " + rewardUnderlyingSymbol
                + (rewardUnderlyingSymbol === 'ETH' ? "" : " (" + rewardAmountInEthFormatted + " ETH)"),
            padding: [0, 0, 0, 2],
            width: 40
        });

        let incentiveMatissa = await state.compound.getLiquidationIncentive();
        let incentiveFactor = await state.compound.formatBN('ETH', incentiveMatissa);
        incentiveFactor = Math.round((incentiveFactor - 1) * 100);
        let incentiveAmount = rewardAmount.mul(incentiveMatissa).div(scale);
        let incentiveAmountFormatted = await state.compound.formatBN(rewardUnderlyingSymbol, incentiveAmount);
        let incentiveAmountInEth = rewardAmountInEth.mul(incentiveMatissa).div(scale);
        let incentiveAmountInEthFormatted = await state.compound.formatBN('ETH', incentiveAmountInEth);
        ui.div({
            text: "=> Adding incentive " + incentiveFactor + "%: "
                + incentiveAmountFormatted + " " + rewardUnderlyingSymbol
                + (rewardUnderlyingSymbol === 'ETH' ? "" : " (" + incentiveAmountInEthFormatted + " ETH)"),
            padding: [0, 0, 0, 2],
            width: 40
        });

        let gain = incentiveAmount.sub(rewardAmount);
        let gainFormatted = await state.compound.formatBN(rewardUnderlyingSymbol, gain);

        let gainInEth = incentiveAmountInEth.sub(rewardAmountInEth);
        let gainInEthFormatted = await state.compound.formatBN('ETH', gainInEth);
        ui.div({
            text: "=> " + chalk.underline("Expected gain: " + gainInEthFormatted + " ETH"
            + " (from " + gainFormatted + " " + rewardUnderlyingSymbol + ")"),
            padding: [0, 0, 0, 2],
            width: 40
        });

        console.log(ui.toString());
        process.exit(0);
    });

program.parse(process.argv);



