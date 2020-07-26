// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract MockCETH is ERC20 {

    constructor() ERC20("cETH", "cETH") public {
        _setupDecimals(8);
    }

    function _mock() public view {

    }

}