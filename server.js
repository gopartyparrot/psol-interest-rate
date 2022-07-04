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
      title: 'Parrot protocol interest rate tracker',
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
    res.writeHead(200);
    res.end(JSON.stringify(cache, "", "  "));
  })
  .listen(8080);
