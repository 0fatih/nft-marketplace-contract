// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
  constructor() ERC20("Test Token", "TT") {

    // mint 1,000,000 token for testing
    _mint(msg.sender, 1_000_000 * 1e18);
  }
}
