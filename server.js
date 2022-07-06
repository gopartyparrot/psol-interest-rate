const { pSOLInterestRate, pBTCInterestRate } = require("./lib.js");
const http = require("http");

let cache = {};

async function update() {
  try {
    // console.log('[debug] will update pSOL');
    const pSOL = await pSOLInterestRate();
    // console.log('[debug] will update pBTC');
    const pBTC = await pBTCInterestRate();
    cache = {
      updatedAt: new Date(),
      pSOL,
      pBTC
    }
  } catch (e) {
    console.log("ERR", e);
  }
}

setInterval(update, 5 * 60 * 1000);
update();

http
  .createServer(function (req, res) {

    const data = JSON.stringify(cache, "", "  ");
    const template = `
<html>
    <header>
      <title>Parrot interest rate tracker</title>
    </header>
    <body>
    <h1>Parrot interest rate tracker</h1>
    <p>
    <label>urls:</label>
      <ul>
        <li><a href="https://trade.dexlab.space/#/market/2SSWeXgcXrCqEEf2A8kN16rRidGVXWdskP8ASdrcWTpC">pSOL serum</a></li>
        <li><a href="https://www.mercurial.finance/pools/psol-2pool">pSOL mercurial</a></li>
        <li><a href="https://gopartyparrot.medium.com/introducing-leverage-interest-rate-to-incentivize-psol-stability-95b2e67d3faa">pSOL medium</a></li>

        <li><a href="https://trade.dexlab.space/#/market/2ZXno5u6RiEAj4Gu9pW2kKxKwbVR4ApB2iDqpGc93qb3">pBTC serum</a></li>
        <li><a href="https://app.saber.so/pools/pbtc/deposit">pBTC saber</a></li>
        <li><a href="https://gopartyparrot.medium.com/introducing-leverage-interest-rate-to-incentivize-pbtc-stability-174525d32753">pBTC medium</a></li>
      </ul>
    </p>
    <div><label>Detail:</label></div>
    <pre>${data}</pre>
    </body>
</html>`

    res.writeHead(200);
    res.end(template);
  })
  .listen(8080);
