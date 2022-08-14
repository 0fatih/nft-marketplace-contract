# NFT Marketplace

Currently you can list, buy and give bid to items in the Marketplace.

# Deployment

There are 3 parameters in the constructor:
  - `_nftAddress`: Your NFT collection address.
  - `_tokenAddress`: You payment token address.
  - `_fee`: Fee for every transaction (NOTE: Base point is 10,000, i.e for 2% enter 200).

# Functions

View Functions:
  - `listings(uint256 saleId)`: Getter for sales.
  - `isListed(uint256 nftId)`: Getter for 'is nft listed'.
  - `bids(uint256 nftId)`: Getter for bids;

Non-view Functions:
  - `list(uint256 nftId, uint256 price)`: You can list items with this function.
  - `buy(uint256 saleId)`: You can buy items with this function (NOTE: First parameter is index for sale in the listings, not nftId).
  - `giveBid(uint256 nftId, uint256 price, uint256 deadline)`: You can give bid to an NFT with this function.
  - `acceptBid(uint256 nftId)`: You can accept the highest bid for your NFT with this function.
  - `cancelBid(uint256 nftId)`: You can cancel a bid with this function.

OnlyOwner Functions:
  - `setFee(uint256 newFee)`: For changing the fee.
