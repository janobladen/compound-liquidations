// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockDAI is ERC20 {

    constructor() ERC20("mockDAI", "DAI") public {
        _mint(msg.sender, 100000000000);
    }

}