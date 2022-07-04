const web3 = require("@solana/web3.js");
const serum = require("@project-serum/serum");
const mer = require("@mercurial-finance/stable-swap-n-pool");
const saberSwap = require("@saberhq/stableswap-sdk")

const conn = new web3.Connection(
  process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
);

const serumProgramV3 = new web3.PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin');
const serumMarketSOLpSOL = new web3.PublicKey('2SSWeXgcXrCqEEf2A8kN16rRidGVXWdskP8ASdrcWTpC')
const serumMarket_pBTCrenBTC = new web3.PublicKey('2ZXno5u6RiEAj4Gu9pW2kKxKwbVR4ApB2iDqpGc93qb3')
const saberStableSwapPBTCrenBTC = new web3.PublicKey('AyiATPCAx5HZstcZ1jdH9rENwFb3yd9zEhkgspvDrCs4')

// return:[bidReserve, askReserve]
async function serumMarketReserves(marketAddr) {
  let market = await serum.Market.load(conn, marketAddr, {}, serumProgramV3);

  let bids = await market.loadBids(conn);
  let asks = await market.loadAsks(conn);

  let bidReserve = 0; //buy pSOL|pBTC
  for (let { price, size, side } of bids) {
    // console.log('[debug] bid price, size', price, size, price >= 0.995)
    if (price >= 0.995) {
      bidReserve += size;
    }
  }

  let askReserve = 0; //sell pSOL|pBTC
  for (let { price, size, side } of asks) {
    // console.log('[debug] ask price, size):', price, size, price <= 0.995)
    if (price <= 0.995) {
      askReserve += size;
    }
  }

  return [bidReserve, askReserve];
}

// return: [SOLReserve, pSOLReserve]
async function merSOLpSOLReserves() {
  const pool = new web3.PublicKey(
    "SoLw5ovBPNfodtAbxqEKHLGppyrdB4aZthdGwpfpQgi"
  ); //pSOL2pool, mints: wSOL-pSOL
  const sim = pool; // NOTE: this can be anything
  const spool = await mer.StableSwapNPool.load(conn, pool, sim);

  let balance = [];
  for (let i = 0; i < spool.tokenMints.length; i++) {
    const ab = await conn.getTokenAccountBalance(spool.tokenAccounts[i]);
    balance.push(ab.value.uiAmount);
  }
  return balance;
}

// return: [tokenAUIReserve, tokenBUIReserve]
async function saberStableSwapReserves(swapAddr) {
  const info = await conn.getAccountInfo(swapAddr);
  const { tokenA, tokenB } = saberSwap.decodeSwap(info.data);
  const tokenAReserve = await conn.getTokenAccountBalance(tokenA.reserve);
  const tokenBReserve = await conn.getTokenAccountBalance(tokenB.reserve);

  return [tokenAReserve.value.uiAmount, tokenBReserve.value.uiAmount];
}

async function pSOLInterestRate() {
  const [serumSOLReserve, serumPSOLReserve] = await serumMarketReserves(serumMarketSOLpSOL);
  const [merSOLReserve, merPSOLReserve] = await merSOLpSOLReserves();

  const solReserve = serumSOLReserve + merSOLReserve;
  const pSOLReserve = serumPSOLReserve + merPSOLReserve;
  const leverageCoefficient = 2;
  const interestRate = Math.max(leverageCoefficient * (pSOLReserve - solReserve) / solReserve, 0)

  return {
    name: 'pSOL interest rate',
    leverageCoefficient,
    solReserve,
    pSOLReserve,
    interestRate,
    formula: 'Math.max(leverageCoefficient * (pSOLReserve - solReserve) / solReserve, 0)',

    serumReserves: {
      sol: serumSOLReserve,
      pSOL: serumPSOLReserve
    },
    merReserves: {
      sol: merSOLReserve,
      pSOL: merPSOLReserve
    }
  };
}

async function pBTCInterestRate() {
  const [serumRenBTCReserve, serumPBTCReserve] = await serumMarketReserves(serumMarket_pBTCrenBTC);
  const [saberRenBTCReserve, saberPBTCReserve] = await saberStableSwapReserves(saberStableSwapPBTCrenBTC);

  const renBTCReserve = serumRenBTCReserve + saberRenBTCReserve;
  const pBTCReserve = serumPBTCReserve + saberPBTCReserve;
  const leverageCoefficient = 7;
  const interestRate = Math.max(leverageCoefficient * (pBTCReserve - renBTCReserve) / pBTCReserve, 0);

  return {
    name: 'pBTC interest rate',
    leverageCoefficient,
    pBTCReserve,
    renBTCReserve,
    interestRate,
    formula: 'Math.max(leverageCoefficient * (pBTCReserve - renBTCReserve) / pBTCReserve, 0)',

    serumReserves: {
      pBTC: serumPBTCReserve,
      renBTC: serumRenBTCReserve
    },
    saberReserves: {
      pBTC: saberPBTCReserve,
      renBTC: saberRenBTCReserve
    }
  }

}

exports.pSOLInterestRate = pSOLInterestRate;
exports.pBTCInterestRate = pBTCInterestRate;
