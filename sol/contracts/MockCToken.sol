// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockCToken is ERC20 {

    constructor(string memory name , string memory symbol) ERC20(name, symbol) public {
        _setupDecimals(8);
    }

}