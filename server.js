const { pSOLInterestRate, pBTCInterestRate, paiInterestRate } = require("./lib.js");
const http = require("http");

let cache = {};

async function update() {
  try {
    const pai = await paiInterestRate();
    const pSOL = await pSOLInterestRate();
    const pBTC = await pBTCInterestRate();
    cache = {
      updatedAt: new Date(),
      pai,
      pSOL,
      pBTC,
    }
  } catch (e) {
    console.log("ERR", e);
  }
}

setInterval(update, 5 * 60 * 1000);
update();

http
  .createServer(function (req, res) {

    const pai = JSON.stringify(cache.pai, "", "  ");
    const pSOL = JSON.stringify(cache.pSOL, "", "  ");
    const pBTC = JSON.stringify(cache.pBTC, "", "  ");

    const rd = function (x) {
      const ir = (x || { interestRate: 0 }).interestRate
      return Math.round(ir * 100) / 100;
    };

    const template = `
<html>
    <head>
      <title>Interest rate tracker</title>
    </head>
    <body>
    <h1>Interest rate tracker</h1>
    <p>
    <label>URL:</label>
      <ul>
        <li>
        PAI
        <a href="https://gopartyparrot.medium.com/introducing-leverage-interest-rate-to-incentivize-parrot-stability-pool-3179c7c192ce">medium</a>
        <a href="https://www.mercurial.finance/pools/pai-3pool">mercurial</a>
        </li>
      
        <li>
        pSOL
        <a href="https://gopartyparrot.medium.com/introducing-leverage-interest-rate-to-incentivize-psol-stability-95b2e67d3faa">medium</a>
        <a href="https://trade.dexlab.space/#/market/2SSWeXgcXrCqEEf2A8kN16rRidGVXWdskP8ASdrcWTpC">serum</a>
        <a href="https://www.mercurial.finance/pools/psol-2pool">mercurial</a>
        </li>

        <li>
          pBTC
          <a href="https://gopartyparrot.medium.com/introducing-leverage-interest-rate-to-incentivize-pbtc-stability-174525d32753">medium</a>
          <a href="https://trade.dexlab.space/#/market/2ZXno5u6RiEAj4Gu9pW2kKxKwbVR4ApB2iDqpGc93qb3">serum</a>
          <a href="https://app.saber.so/pools/pbtc/deposit">saber</a>
        </li>

      </ul>
    </p>
    <div><label>Detail:</label></div>
    <p><code>interestRate = leverageCoefficient * (tokenReserve - liquidityReserve) / liquidityReserve</code></p>
    <table>
      <tr>
        <td>PAI  &nbsp; ${rd(cache.pai)}</td>
        <td>pSOL &nbsp; ${rd(cache.pSOL)}</td>
        <td>pBTC &nbsp; ${rd(cache.pBTC)}</td>
      </tr>
      <tr>
        <td><pre>${pai}</pre></td>
        <td><pre>${pSOL}</pre></td>
        <td><pre>${pBTC}</pre></td>
      </tr>
      
    </table>
    </body>
</html>`

    res.writeHead(200);
    res.end(template);
  })
  .listen(8080);
