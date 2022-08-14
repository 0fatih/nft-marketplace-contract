// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TestNFT is ERC721 {
  constructor() ERC721("Test NFT", "TNFT") {

    // mint 10 nft for testing
    for(uint i = 1; i <= 10; i++) {
      _mint(msg.sender, i);
    }

    _mint(address(1), 0);
  }
}
