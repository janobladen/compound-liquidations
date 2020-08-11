// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./CErc20.sol";


contract LiquidationBot is Ownable {

    constructor() public {
    }

    function liquidateErc20(address borrowerAccount,
        address borrowContract,
        uint amount,
        CErc20 collateralAddress) onlyOwner public
    {
        CErc20 cBorrowContract = CErc20(borrowContract);
        cBorrowContract.approve(address(this), amount);
        cBorrowContract.liquidateBorrow(borrowerAccount, amount, collateralAddress);
    }

    function drain(address tokenContractAddress) onlyOwner public returns (uint256) {
        Erc20 tokenContract = Erc20(tokenContractAddress);
        address _owner = owner();
        uint256 _balance = tokenContract.balanceOf(address(this));
        if (_balance == 0) return _balance;
        if (!tokenContract.transfer(_owner, _balance)) {
            revert('trasnfer() failed.');
        }
        return _balance;
    }

    function fund() external payable onlyOwner {
    }

}

