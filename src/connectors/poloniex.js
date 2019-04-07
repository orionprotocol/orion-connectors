const Connector = require("./connector");
const Balances = require("../models/balances");
const Ticker = require("../models/ticker");
const OrderBook = require("../models/order_book");
const Order = require("../models/order");
const Poloniex = require("poloniex-api-node");
const PoloniexWebsocket = require("./poloniex_websocket");
const rp = require("request-promise");
const Status = require("../models/status");

const POLONIEX_STATUSES = (status) => {
    switch(status) {
        case "Open":
            return "opened";
        case "Partially filled":
            return "fillable";
        default:
            return "closed";
    }
};

class PoloniexConnector extends Connector{
    constructor(exchange) {
        super();
        this.poloniex = new Poloniex(exchange.apiKey, exchange.secretKey, { nonce: () => Date.now() });
        this.websocket = new PoloniexWebsocket(exchange, this.poloniex);
        this.exchange = exchange;
        this.publicApi = "https://poloniex.com/public";
        this.privateApi = "https://poloniex.com/tradingApi";
    }

    static convertToPoloniexPair(symbol) {
        const assets = symbol.split('-');
        return `${assets[1]}_${assets[0]}`;
    }

    static unformatPair(pair) {
        const assets = pair.split('_');
        return `${assets[1]}-${assets[0]}`;
    }

    async submitOrder(order) {
        let response;
        const pair = PoloniexConnector.convertToPoloniexPair(order.symbol);

        if (order.side === "buy")
            response = await this.poloniex.buy(pair, order.price, order.qty);
        else if (order.side === "sell")
            response = await this.poloniex.sell(pair, order.price, order.qty);

        return new Order(
            this.exchange.id,
            response.orderNumber,
            order.symbol,
            order.side,
            order.price,
            order.qty,
            "LIMIT",
            new Date().getTime(),
            Status.NEW);
    };

    async cancelOrder(order) {
        const response = await this.poloniex.cancelOrder(order.id);

        return {
            message: "Successfully cancel order(" + order.id + ") from " + this.exchange.id + " exchange",
            id: order.id
        };
    };

    async getBalances() {
        const response = await this.poloniex.returnBalances();

        let balance = {};
        for (let currency in response) {
            if (parseFloat(response[currency]) === 0) continue;
            balance[currency] = response[currency];
        }

        return new Balances(balance);
    };

    async getTicker(pair) {
        let response = await this.poloniex.returnTicker();

        if (response[pair] === undefined || response[pair] === null) throw new Error("INVALID_MARKET");

        return new Ticker(response[pair].last, response[pair].lowestAsk, response[pair].highestBid, pair);
    };

    async getOrderBook(pair, depth = 100) {
        //Get Order Book
        const response = await this.poloniex.returnOrderBook(pair, depth);

        //Parse to model data
        let bids = [];
        response.bids.forEach(function(item, i) {
            bids[i] = {
                rate: parseFloat(item[0]),
                amount: parseFloat(item[1])
            };
        });

        //Parse to model data
        let asks = [];
        response.asks.forEach(function(item, i) {
            asks[i] = {
                rate: parseFloat(item[0]),
                amount: parseFloat(item[1])
            };
        });

        return new OrderBook(bids, asks);
    };

    async getOrderStatus(id) {

        const params = {
            command: "returnOrderStatus",
            orderNumber: id,
            nonce: Date.now()
        };

        const options = {
            method: "POST",
            uri: this.privateApi,
            form: params,
            headers: this.poloniex._getPrivateHeaders(params),
        };

        const response = JSON.parse(await rp(options));

        if (response.success !== 1) throw response.result.error;

        const obj = response.result[id];

        const pair = obj.currencyPair;
        const rate = obj.rate;
        const amount = obj.amount;
        const time = new Date(obj.date).getTime();
        const side = obj.type;
        const status = obj.status;

        return new Order(
            pair,
            rate,
            amount,
            id,
            time,
            side,
            this.exchange,
            undefined,
            POLONIEX_STATUSES(status)
        );
    };

    async getOrderHistory(pair, start, end) {
        const response = await this.poloniex.returnMyTradeHistory(pair, start.getTime(), end.getTime(), 100);

        let orders = [];
        const exchange = this.exchange;
        response.forEach(function(item, i) {
            orders[i] = new Order(
                pair,
                item.rate,
                item.amount,
                item.orderNumber,
                Date.parse(item.date),
                item.type,
                exchange,
                undefined,
                "closed");
        });

        return orders;
    };

    async getOpenOrders(pair = "all") {
        const response = await this.poloniex.returnOpenOrders(pair);

        let openOrders = {};

        const current = this;
        //Fill in the OpenOrders
        const getOrders = (iterable, pair) => {
            let orders = [];
            iterable.forEach(function (item, i) {
                orders[i] = new Order(
                    pair,
                    item.rate,
                    item.amount,
                    item.orderNumber,
                    Date.now(),
                    item.type,
                    current.exchange
                );
            });
            return orders;
        };

        if (pair !== "all") {
            openOrders[pair] = getOrders(response, pair);
        } else {
            for (let cpair in response) {
                if (response[cpair].length > 0)
                    openOrders[cpair] = getOrders(response[cpair], cpair);
            }
        }
        return openOrders;
    };
}

module.exports = PoloniexConnector;
