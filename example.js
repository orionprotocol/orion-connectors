const {UTG, Exchanges} = require("./utg");

function log(header, data) {
    console.log(header + '\n', JSON.stringify(data, null, 2) + "\n");
}

(async function main() {
    const exchanges = {
        poloniex: {
            secret: "",
            key: ""
        },
        bittrex: {
            secret: "",
            key: ""
        },
        binance: {
            secret: "",
            key: ""
        }
    };


    const main = new UTG(exchanges);
    log("Get balance", await main.getBalances());
    log("Get ticker", await main.getTicker("BTC_ETH"));
    log("Get order book", await main.getOrderBook("BTC_ETH"));
    log("Get order history", await main.getOrderHistory("BTC_ETH", new Date(2018, 9, 14), new Date(2018, 9, 16)));
    log("Get open orders", await main.getOpenOrders("BTC_ETH"));
})();
