const { calculateInterestRate } = require("./lib.js");
const http = require("http");

let cache = {};

async function update() {
  try {
    const ret = await calculateInterestRate();
    cache = {
      date: new Date(),
      data: ret
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
