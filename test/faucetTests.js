const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

describe("Faucet", function() {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.

    async function deployContractAndSetVariables() {
        const Faucet = await ethers.getContractFactory("Faucet");
        const faucet = await Faucet.deploy();

        const [owner, hacker] = await ethers.getSigners();

        let withdrawAmount = ethers.utils.parseUnits("1", "ether");

        let totalBalance = ethers.utils.formatEther(await ethers.provider.getBalance(owner.address));

        console.log(`Owner Balance: ${totalBalance}`)

        console.log(`Owner adddress: ${owner.address}`);

        return { faucet, owner, hacker, withdrawAmount, totalBalance };
    }

    it('should deploy and set the owner correctly', async function() {
        const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

        expect(await faucet.owner()).to.equal(owner.address);
    });

    it('should not allow withdrawals above 0.1 ETH at a time', async function() {
        const { faucet, withdrawAmount } = await loadFixture(deployContractAndSetVariables);
        await expect(faucet.withdraw(withdrawAmount)).to.be.reverted;
    });

    it('should be able to withdrawal all funds in the account as the owner', async function() {
        const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

        expect(await faucet.owner()).to.equal(owner.address);

        const balanceBefore = await owner.getBalance();
        const balanceContractBefore = await faucet.provider.getBalance(faucet.address);

        const withdrawnTx = await faucet.connect(owner).withdrawAll();
        
        const balance = await ethers.provider.getBalance(faucet.address);

        const balanceAfter = await owner.getBalance();
        const balanceContractAfter = await faucet.provider.getBalance(faucet.address);
        
        const {gasUsed, effectiveGasPrice} = await withdrawnTx.wait();

        const gasCost = gasUsed.mul(effectiveGasPrice);

        expect(balance).to.be.eq(0);

        expect(balanceAfter).to.be.lessThan(balanceBefore);

        expect(balanceContractAfter).to.be.equal(0);

        expect(balanceContractBefore.add(balanceBefore).toString()).to.equal(
            balanceAfter.add(gasCost).toString()
          );
    });

    it('should not be able to withdraw all funds as a non owner', async function() {
        const { faucet, hacker } = await loadFixture(deployContractAndSetVariables);

        await expect(faucet.connect(hacker).withdrawAll()).to.be.reverted;
    });

    it('should be able to destroy the contract as the owner only', async function() {
        const { faucet, owner } = await loadFixture(deployContractAndSetVariables);

        expect(await faucet.owner()).to.equal(owner.address);

        await faucet.destroyFaucet();

        expect(await ethers.provider.getCode(faucet.address)).to.hexEqual("0x");
    });

    it('should not be able to destroy the contract as a non owner user', async function() {
        const { faucet, hacker } = await loadFixture(deployContractAndSetVariables);

        await expect(faucet.connect(hacker).destroyFaucet()).to.be.reverted;
    });
});