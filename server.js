const { calculateInterestRate } = require("./lib.js");
const http = require("http");

let cache = {
  time: new Date(),
  value: null,
};

const listener = async function (req, res) {
  // cache 5m
  if (
    !cache.value ||
    new Date().getTime() - cache.time.getTime() > 5 * 60 * 1000
  ) {
    console.log("fetch");
    const data = await calculateInterestRate();
    cache.value = data;
    cache.time = new Date();
  }

  res.writeHead(200);
  res.end(JSON.stringify(cache.value, "", "  "));
};

const server = http.createServer(listener);
server.listen(8080);
