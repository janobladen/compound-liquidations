const HDWalletProvider = require('@truffle/hdwallet-provider');
const TestConfig = require('./test/_helpers/TestConfig');

const testProvider = new HDWalletProvider(TestConfig.ganache.mnemonic, TestConfig.ganache.uri);

module.exports = {

    migrations_directory: "./sol/migrations",
    contracts_build_directory: "./sol/build",
    contracts_directory: "./sol/contracts",

    networks: {
        development: {
            provider: testProvider,
            host: "127.0.0.1",
            port: 14603,
            network_id: "*",
            websockets: true,
        },
    },

    compilers: {
        solc: {
            version: "0.6.11"
        }
    }
}
