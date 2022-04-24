const web3 = require("@solana/web3.js");
const serum = require("@project-serum/serum");
const spltoken = require("@solana/spl-token");
const mer = require("@mercurial-finance/stable-swap-n-pool");
const bn = require("bn.js");

const conn = new web3.Connection(
  process.env.RPC_URL || "https://api.mainnet-beta.solana.com"
);

// return:[SOLReserve, pSOLReserve]
async function serumReserves() {
  let marketAddr = new web3.PublicKey(
    "2SSWeXgcXrCqEEf2A8kN16rRidGVXWdskP8ASdrcWTpC"
  ); //sol-pSOL
  let program = new web3.PublicKey(
    "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
  ); //v3
  let market = await serum.Market.load(conn, marketAddr, {}, program);

  let bids = await market.loadBids(conn); // buy pSOL
  let asks = await market.loadAsks(conn); // sell pSOL

  let solReserve = 0;
  for (let { price, size, side } of bids) {
    if (price >= 0.995) {
      solReserve += size;
    }
  }

  let pSOLReserve = 0;
  for (let { price, size, side } of asks) {
    if (price <= 0.995) {
      pSOLReserve += size;
    }
  }

  return [solReserve, pSOLReserve];
}

// return: [SOLReserve, pSOLReserve]
async function merReserves() {
  const pool = new web3.PublicKey(
    "SoLw5ovBPNfodtAbxqEKHLGppyrdB4aZthdGwpfpQgi"
  ); //pSOL2pool, mints: wSOL-pSOL
  const sim = pool; // NOTE: this can be anything
  const spool = await mer.StableSwapNPool.load(conn, pool, sim);

  let balance = [];
  for (let i = 0; i < spool.tokenMints.length; i++) {
    const token = new spltoken.Token(
      conn,
      spool.tokenMints[i],
      spltoken.TOKEN_PROGRAM_ID,
      sim
    );
    const acc = await token.getAccountInfo(spool.tokenAccounts[i]);
    balance.push(acc.amount.div(new bn.BN(web3.LAMPORTS_PER_SOL)).toNumber());
  }
  return balance;
}

async function calculateInterestRate() {
  const serumRsvs = await serumReserves();
  const merRsvs = await merReserves();

  const solReserve = serumRsvs[0] + merRsvs[0];
  const pSOLReserve = serumRsvs[1] + merRsvs[1];

  const leverageCoefficient = 2;

  let interestRate =
    (leverageCoefficient * (pSOLReserve - solReserve)) / solReserve;
  if (interestRate < 0) {
    interestRate = 0;
  }

  return { solReserve, pSOLReserve, interestRate };
}

exports.calculateInterestRate = calculateInterestRate;
