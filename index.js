const web3 = require('@solana/web3.js')
const serum = require('@project-serum/serum')
const spltoken = require('@solana/spl-token')
const merStableSwapNPool = require('@mercurial-finance/stable-swap-n-pool')
const bn = require('bn.js')


const connection = new web3.Connection(process.env.RPC_URL || 'https://parrot.rpcpool.com');
const debug = process.env.DEBUG || false;

// [SOLReserve, pSOLReserve]
async function serumReserves() {
  // let marketAddress = new web3.PublicKey('9wFFyRfZBsuAha4YcuxcXLKwMxJR43S7fPfQLusDBzvT'); //SOL-USDC
  let marketAddress = new web3.PublicKey('2SSWeXgcXrCqEEf2A8kN16rRidGVXWdskP8ASdrcWTpC'); //sol-pSOL
  let programAddress = new web3.PublicKey("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"); //v3
  let market = await serum.Market.load(connection, marketAddress, {}, programAddress);

  let bids = await market.loadBids(connection);
  let asks = await market.loadAsks(connection);

  // TODO maybe we should ignore order with price that offset too much from real price

  let solReserve = 0;
  for (let { price, size, side } of bids) {
    if (price <= 1.005) {
      solReserve += size;
    }
    if (debug) {
      console.log('price:', price, 'size:', size, side)
    }
  }

  let pSOLReserve = 0;
  for (let { price, size, side } of asks) {
    if (price <= 0.995) {
      pSOLReserve += size;
    }
    if (debug) {
      console.log('price:', price, 'size:', size, side)
    }
  }

  return [solReserve, pSOLReserve]
}

//[SOLReserve, pSOLReserve]
async function merReserves() {
  // const pSOLMint = new web3.PublicKey('9EaLkQrbjmbbuZG9Wdpo8qfNUEjHATJFSycEmw6f1rGX')
  // const wSOLMint = new web3.PublicKey('So11111111111111111111111111111111111111112')

  const sim = new web3.PublicKey("SoLw5ovBPNfodtAbxqEKHLGppyrdB4aZthdGwpfpQgi")   // NOTE: this can be anything
  const pool = new web3.PublicKey('SoLw5ovBPNfodtAbxqEKHLGppyrdB4aZthdGwpfpQgi')//pSOL2pool, mints: wSOL-pSOL
  const spool = await merStableSwapNPool.StableSwapNPool.load(connection, pool, sim);

  let balance = [];
  for (let i = 0; i < spool.tokenMints.length; i++) {
    const token = new spltoken.Token(connection, spool.tokenMints[i], spltoken.TOKEN_PROGRAM_ID, sim)
    const acc = await token.getAccountInfo(spool.tokenAccounts[i])
    balance.push(acc.amount.div(new bn.BN(1e9)).toNumber()) //SOL decimals: 9
  }
  return balance
}

async function calculateInterestRate() {
  const serumRsvs = await serumReserves()
  const merRsvs = await merReserves()

  if (debug) {
    console.log('serum reserves', serumRsvs)
    console.log('mercurial reserves', merRsvs)
  }

  const solReserve = serumRsvs[0] + merRsvs[0];
  const pSOLReserve = serumRsvs[1] + merRsvs[1];
  const leverageCoefficient = 2;

  let interestRate = leverageCoefficient * (pSOLReserve - solReserve) / solReserve;
  if (interestRate < 0) {
    if (debug) {
      console.log(interestRate, ' --> 0')
    }
    interestRate = 0
  }

  console.log('solReserve', solReserve)
  console.log('pSOLReserve', pSOLReserve)
  console.log('solReserve/pSOLReserve', solReserve / pSOLReserve)
  console.log('interest rate', interestRate);
}

calculateInterestRate()