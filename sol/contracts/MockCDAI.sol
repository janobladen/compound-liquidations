// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "./MockCToken.sol";

contract MockDAI is MockCToken {

    constructor() MockCToken("cDAI", "cDAI") public {
        _mint(msg.sender, 1000000);
    }

}