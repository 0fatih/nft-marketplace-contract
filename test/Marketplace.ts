import {
  time as htime,
  loadFixture,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Marketplace, TestNFT } from "../typechain-types";

const ether = (number: string) => {
  return ethers.utils.parseEther(number);
};

describe("Marketplace", function () {
  const list = async (
    marketplace: Marketplace,
    nft: TestNFT,
    id: number,
    price: number
  ) => {
    await nft.approve(marketplace.address, id);

    await marketplace.list(id, ether(price.toString()));
  };

  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("TestToken");
    const token = await Token.deploy();
    await token.deployed();

    const NFT = await ethers.getContractFactory("TestNFT");
    const nft = await NFT.deploy();
    await nft.deployed();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy(
      nft.address,
      token.address,
      1000
    );
    await marketplace.deployed();

    return { token, nft, marketplace, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Check constants", async function () {
      const { token, nft, marketplace } = await loadFixture(deployFixture);

      expect(await marketplace.TOKEN()).to.equal(token.address);
      expect(await marketplace.NFT()).to.equal(nft.address);
    });
  });

  describe("Listing", function () {
    it("Try to list a token that you don't own", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(marketplace.list(0, 1)).to.be.revertedWith(
        "ERC721: caller is not token owner nor approved"
      );
    });

    it("Try to list a token without approve", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(marketplace.list(1, 1)).to.be.revertedWith(
        "ERC721: caller is not token owner nor approved"
      );
    });

    it("List a token ~ legal", async function () {
      const { owner, nft, marketplace } = await loadFixture(deployFixture);

      await list(marketplace, nft, 1, 1);

      const res = await marketplace.listings(0);
      expect(res.id).to.equal(1);
      expect(res.price).to.equal(ether("1"));
      expect(res.owner).to.equal(owner.address);
    });

    it("List first 5 nfts", async function () {
      const { owner, nft, marketplace } = await loadFixture(deployFixture);

      for (let i = 1; i <= 5; i++) {
        await list(marketplace, nft, i, i);

        const res = await marketplace.listings(i - 1);
        expect(res.id).to.equal(i);
        expect(res.price).to.equal(ether(i.toString()));
        expect(res.owner).to.equal(owner.address);
      }
    });
  });

  describe("Buy", function () {
    it("Try to buy self item", async function () {
      const { nft, marketplace } = await loadFixture(deployFixture);

      await list(marketplace, nft, 1, 1);

      await expect(marketplace.buy(0)).to.be.revertedWithCustomError(
        marketplace,
        "CanNotBuySelfItem"
      );
    });

    it("Try to buy without token", async function () {
      const { nft, marketplace, otherAccount } = await loadFixture(
        deployFixture
      );

      await list(marketplace, nft, 1, 1);

      await expect(marketplace.connect(otherAccount).buy(0)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("Try to buy without approve", async function () {
      const { otherAccount, nft, marketplace, token } = await loadFixture(
        deployFixture
      );

      await list(marketplace, nft, 1, 1);

      // feed otherAccount
      await token.transfer(otherAccount.address, 1);

      await expect(marketplace.connect(otherAccount).buy(0)).to.be.revertedWith(
        "ERC20: insufficient allowance"
      );
    });

    it("Buy ~ legally", async function () {
      const { otherAccount, nft, marketplace, token } = await loadFixture(
        deployFixture
      );

      await list(marketplace, nft, 1, 1);

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("10"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace.connect(otherAccount).buy(0);
    });

    it("Buy 4 of 5 items", async function () {
      const { token, otherAccount, owner, nft, marketplace } =
        await loadFixture(deployFixture);

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      for (let i = 1; i <= 5; i++) {
        await list(marketplace, nft, i, i);

        const res = await marketplace.listings(i - 1);
        expect(res.id).to.equal(i);
        expect(res.price).to.equal(ether(i.toString()));
        expect(res.owner).to.equal(owner.address);
      }

      for (let i = 0; i < 4; i++) {
        await marketplace.connect(otherAccount).buy(0);
      }

      expect(await token.balanceOf(marketplace.address)).to.equal(ether("1.3"));
    });
  });

  describe("Bidding", function () {
    it("Try to give a bid to self item", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(
        marketplace.giveBid(1, ether("1"), (await htime.latest()) + 10)
      ).to.be.revertedWithCustomError(marketplace, "CanNotBidSelfItem");
    });
    it("Bid for an item", async function () {
      const { token, otherAccount, marketplace } = await loadFixture(
        deployFixture
      );

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace
        .connect(otherAccount)
        .giveBid(1, ether("1"), (await htime.latest()) + 10);
    });
  });

  describe("Accept Bid", function () {
    it("Try to accept a bid that doesn't exists", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(marketplace.acceptBid(1)).to.be.revertedWithCustomError(
        marketplace,
        "ThereIsNoBid"
      );
    });

    it("Try to accept a bid with outdated deadline", async function () {
      const { token, otherAccount, marketplace } = await loadFixture(
        deployFixture
      );

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace
        .connect(otherAccount)
        .giveBid(1, ether("1"), (await htime.latest()) + 10);

      await htime.increase(20);

      await expect(marketplace.acceptBid(1)).to.be.revertedWithCustomError(
        marketplace,
        "BidOutDated"
      );
    });

    it("Try to steal an approved nft with accept bid", async function () {
      const { token, otherAccount, marketplace, nft } = await loadFixture(
        deployFixture
      );

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace
        .connect(otherAccount)
        .giveBid(1, ether("1"), (await htime.latest()) + 10);

      // give approve for nft
      await nft.approve(marketplace.address, 1);

      await expect(
        marketplace.connect(otherAccount).acceptBid(1)
      ).to.be.revertedWith("ERC721: transfer from incorrect owner");
    });

    it("Accept a bid", async function () {
      const { owner, token, otherAccount, marketplace, nft } =
        await loadFixture(deployFixture);

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace
        .connect(otherAccount)
        .giveBid(1, ether("1"), (await htime.latest()) + 10);

      // give approve for nft
      await nft.approve(marketplace.address, 1);

      const balance = await token.balanceOf(owner.address);
      await marketplace.acceptBid(1);

      expect((await token.balanceOf(owner.address)).gt(balance)).to.equal(true);
      expect(await nft.ownerOf(1)).to.equal(otherAccount.address);
    });
  });

  describe("Cancel Bid", function () {
    it("Try to cancel a bid that doesnt exists", async function () {
      const { marketplace } = await loadFixture(deployFixture);

      await expect(marketplace.cancelBid(1)).to.be.revertedWithCustomError(
        marketplace,
        "CanNotCancelThisBid"
      );
    });

    it("Try to cancel a bid that now owned", async function () {
      const { token, otherAccount, marketplace } = await loadFixture(
        deployFixture
      );

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace
        .connect(otherAccount)
        .giveBid(1, ether("1"), (await htime.latest()) + 10);

      await expect(marketplace.cancelBid(1)).to.be.revertedWithCustomError(
        marketplace,
        "CanNotCancelThisBid"
      );
    });

    it("Cancel a bid", async function () {
      const { token, otherAccount, marketplace } = await loadFixture(
        deployFixture
      );

      // feed otherAccount
      await token.transfer(otherAccount.address, ether("100"));

      await token
        .connect(otherAccount)
        .approve(marketplace.address, ethers.constants.MaxUint256);

      await marketplace
        .connect(otherAccount)
        .giveBid(1, ether("1"), (await htime.latest()) + 10);

      await marketplace.connect(otherAccount).cancelBid(1);
    });
  });
});
