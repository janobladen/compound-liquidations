// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CErc20.sol";


contract CompoundLiquidationBot is Ownable {

    constructor() public {

    }

    function liquidateErc20(address borrowerAccount,
        address borrowContract,
        uint amount,
        CErc20 collateralAddress) public
    {
        CErc20 cBorrowContract = CErc20(borrowContract);
        cBorrowContract.approve(address(this), amount);
        cBorrowContract.liquidateBorrow(borrowerAccount, amount, collateralAddress);
    }

}

