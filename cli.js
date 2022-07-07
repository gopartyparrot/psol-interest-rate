const { pSOLInterestRate, pBTCInterestRate, paiInterestRate } = require('./lib.js')

pSOLInterestRate().then((ret) => console.log('pSOL interest rate', ret));
pBTCInterestRate().then((ret) => console.log('pBTC interest rate', ret));
paiInterestRate().then((ret) => console.log('pai interest rate', ret));