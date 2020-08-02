// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CompoundLiquidationBot is Ownable {

    mapping(string => address) public contractAddresses;

    constructor() public {

    }

    function liquidateErc20(address borrowerAccount,
        address borrowContract,
        uint amount,
        address collateralAddress) public
    {



    }

}