// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockCEth is ERC20 {

    constructor() ERC20("cETH", "cETH") public {
        _setupDecimals(8);
    }

}