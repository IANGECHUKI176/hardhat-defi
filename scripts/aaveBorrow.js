const { getWeth, AMOUNT } = require("./getWeth")
const { getNamedAccounts, ethers } = require("hardhat")
const main = async () => {
    //Protocol treats everything as an ERC20 token
    await getWeth()
    const { deployer } = await getNamedAccounts()
    //depositing into aave

    //contract address, abi
    //
    //Lending Pool Address Provider -->0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
    //Lending Pool
    const lendingPool = await getLendingPool(deployer)
    console.log("lending  pool address", lendingPool.address)
    //deposit
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
    await approveERC20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)
    console.log("Depositing....")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0)
    console.log("Deposited")
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
        lendingPool,
        deployer
    )
    const daiPrice = await getDaiPriceFeed()
    const amountDaiToBorrow =
        availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())
    const amountDaiToBorrowWei = ethers.utils.parseEther(
        amountDaiToBorrow.toString()
    )
    console.log(`You can borrow ${amountDaiToBorrow.toString()} DAI`)
    const daiTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f"
    await borrowDai(daiTokenAddress,lendingPool,amountDaiToBorrowWei,deployer)
    await repay(daiTokenAddress,lendingPool,amountDaiToBorrowWei,deployer)
}
async function borrowDai(
    daiAddress,
    lendingPool,
    amountDaiToBorrowWei,
    account
) {
    const borrowTx = await lendingPool.borrow(
        daiAddress,
        amountDaiToBorrowWei,
        1,
        0,
        account
    )
    await borrowTx.wait(1)
    console.log(`You have borrowed!`)
}
async function repay(
    daiAddress,
    lendingPool,
    amount,
    account
) {
    await approveERC20(daiAddress,lendingPool.address,amount,account)
    const repayTx=await lendingPool.reapy(daiAddress,amount,1,account)
    await repayTx.wait(1)
    console.log("repayed")
}
async function getDaiPriceFeed() {
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    )
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`pricefeed for DAI/ETH ${price}`)
    return price
}
async function getBorrowUserData(lendingPool, account) {
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH `)
    return { totalDebtETH, availableBorrowsETH }
}
async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()

    const lendingPool = await ethers.getContractAt(
        "ILendingPool",
        lendingPoolAddress,
        account
    )
    return lendingPool
}
async function approveERC20(
    erc20Address,
    spenderAddress,
    amountToSpend,
    account
) {
    const erc20Token = await ethers.getContractAt(
        "IERC20",
        erc20Address,
        account
    )
    const tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("approved")
}
main()
    .then(() => {
        process.exit(0)
    })
    .catch(err => {
        console.log(err)
        process.exit(1)
    })
