// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is Ownable {
  // Base Point
  uint256 public constant BP = 10_000;

  // Your NFT contract
  IERC721 public immutable NFT;
  
  // Your payment token
  IERC20 public immutable TOKEN;

  // Fee on every transaction ~ Base Point is 10,000
  uint256 public FEE;

  struct Listing {
    uint256 id;
    uint256 price;
    address owner;
  }

  // All listings
  Listing[] public listings;

  // For preventing double-listing
  mapping(uint256 => bool) public isListed;

  struct Bid {
    uint256 price;
    address bidder;
    uint256 deadline;
  }

  // For storing the bids
  mapping(uint256 => Bid) public bids;

  constructor(address _nftAddress, address _tokenAddress, uint256 _fee) {
    NFT = IERC721(_nftAddress);
    TOKEN = IERC20(_tokenAddress);
    FEE = _fee;
  }

  function list(uint256 nftId, uint256 price) external {
     if(isListed[nftId])
       revert AlreadyListed(nftId);

     if(price == 0)
       revert CanNotListForZero(msg.sender, nftId);

     // Get nft from user
     NFT.transferFrom(msg.sender, address(this), nftId);

     listings.push(Listing({
       owner: msg.sender,
       id: nftId,
       price: price
     }));

     isListed[nftId] = true;

     emit Listed(msg.sender, nftId, price);
  }

  function buy(uint256 saleId) external {
    Listing memory _sale = listings[saleId];

    if(_sale.owner == address(0))
      revert InvalidSaleId(saleId);

    if(msg.sender == _sale.owner)
      revert CanNotBuySelfItem(msg.sender, _sale.id);

    uint256 feeAmount = (_sale.price * FEE) / BP;

    // Take payment from the caller
    bool res = TOKEN.transferFrom(msg.sender, _sale.owner, _sale.price - feeAmount);
    if(!res)
      revert TransferFromFailed(msg.sender, _sale.owner, _sale.price);

    // Take fee
    res = TOKEN.transferFrom(msg.sender, address(this), feeAmount);
    if(!res)
      revert TransferFromFailed(msg.sender, address(this), _sale.price);

    // Send NFT to the caller
    NFT.transferFrom(address(this), msg.sender, _sale.id);

    // clear data
    listings[saleId] = listings[listings.length - 1];
    listings.pop();

    isListed[saleId] = false;

    emit Buyed(msg.sender, _sale.owner, _sale.id, _sale.price);
  }

  function giveBid(uint256 nftId, uint256 price, uint256 deadline) external {
    Bid memory oldBid = bids[nftId];

    if(deadline < block.timestamp)
      revert InvalidDeadline(block.timestamp, deadline);

    if(NFT.ownerOf(nftId) == msg.sender)
      revert CanNotBidSelfItem(msg.sender, nftId);

    // Also detects 0 biddings.
    if(oldBid.price >= price && oldBid.deadline > block.timestamp)
      revert BadBid(oldBid.price, price);
    
    // Take payment from user
    bool res = TOKEN.transferFrom(msg.sender, address(this), price);
    if(!res)
      revert TransferFromFailed(msg.sender, address(this), price);

    bids[nftId] = Bid({
      bidder: msg.sender,
      price: price,
      deadline: deadline
    });

    emit NewBid(msg.sender, nftId, price, deadline);
  }

  function acceptBid(uint256 nftId) external {
    Bid memory bid = bids[nftId];

    if(bid.bidder == address(0))
      revert ThereIsNoBid(nftId);

    if(block.timestamp > bid.deadline)
      revert BidOutDated(block.timestamp, bid.deadline);

    // Transfer NFT
    NFT.transferFrom(msg.sender, bid.bidder, nftId);

    delete bids[nftId];

    // Give payment to the owner
    uint256 feeAmount = (bid.price * FEE) / BP;
    bool res = TOKEN.transfer(msg.sender, bid.price - feeAmount);
    if(!res)
      revert TransferFailed(address(this), msg.sender, bid.price - feeAmount);

    emit AcceptBid(msg.sender, nftId, bid.price);
  }

  function cancelBid(uint256 nftId) external {
    Bid memory bid = bids[nftId];

    if(bid.bidder != msg.sender)
      revert CanNotCancelThisBid(msg.sender, bid.bidder);

    delete bids[nftId];

    bool res = TOKEN.transfer(msg.sender, bid.price);
    if(!res)
      revert TransferFailed(address(this), msg.sender, bid.price);
  }

  // Only Owner Functions
  function setFee(uint256 _newFee) external onlyOwner {
    FEE = _newFee;
  }

  // Events
  event Listed(address indexed owner, uint256 nftId, uint256 price);
  event Buyed(address indexed buyer, address indexed owner, uint256 nftId, uint256 price);
  event NewBid(address indexed bidder, uint256 nftId, uint256 price, uint256 deadline);
  event AcceptBid(address indexed owner, uint256 nftId, uint256 price);

  // Errors
  error AlreadyListed(uint256 nftId);
  error CanNotListForZero(address caller, uint256 nftId);
  error InvalidSaleId(uint256 saleId);
  error TransferFromFailed(address caller, address nftOwner, uint256 price);
  error CanNotBuySelfItem(address owner, uint256 nftId);
  error CanNotBidSelfItem(address owner, uint256 nftId);
  error BadBid(uint256 oldBid, uint256 price);
  error InvalidDeadline(uint256 now, uint256 deadline);
  error BidOutDated(uint256 now, uint256 deadline);
  error TransferFailed(address from, address to, uint256 amount);
  error ThereIsNoBid(uint256 nftId);
  error CanNotCancelThisBid(address caller, address bidder);
}
