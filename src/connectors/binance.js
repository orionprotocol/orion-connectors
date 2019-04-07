const Connector = require("./connector");
const Balances = require("../models/balances");
const Ticker = require("../models/ticker");
const OrderBook = require("../models/order_book");
const Order = require("../models/order");
const Binance = require("binance-api-node").default;
const BinanceWebsocket = require("./binance_websocket");
const rp = require("request-promise");
const Status = require("../models/status");

const BINANCE_STATUSES = (status) => {
    switch(status) {
        case "NEW":
            return Status.NEW;
        case "PARTIALLY_FILLED":
            return Status.PARTIALLY_FILLED;
        case "FILLED":
            return Status.FILLED;
        case "CANCELED":
        case "REJECTED":
        case "EXPIRED":
            return Status.CANCELED;
    }
};

class BinanceConnector extends Connector{
    constructor(exchange) {
        super();
        this.binance = new Binance({apiKey: exchange.apiKey, apiSecret: exchange.secretKey});
        this.websocket = new BinanceWebsocket(exchange, this.binance);
        this.exchange = exchange;
    }

    static convertToBinanceSymbol(symbol) {
        return symbol.replace("_", "").replace("-", "");
    }

    async submitOrder(order) {
        order.price = order.price.toFixed(7);
        const response = await this.binance.order(
            {
                symbol: BinanceConnector.convertToBinanceSymbol(order.symbol),
                side: order.side,
                quantity: order.qty,
                price: order.price
            });

        /*const parsedPair = await this.unformatPair(order.pair);
        return await this.getOrderStatus(parsedPair + "-" + response.orderId);*/

        return new Order(
            this.exchange.id,
            response.orderId,
            order.symbol,
            order.side,
            order.price,
            order.qty,
            "LIMIT",
            response.transactTime,
            response.status ? BINANCE_STATUSES(response.status) : Status.NEW);
    };

    async cancelOrder(order) {
        const response = await this.binance.cancelOrder({symbol: this.formatPair(order.pair), orderId: order.id});

        return {
            message: "Successfully cancel order(" + order.id + ") from " + this.exchange.id + " exchange",
            id: order.id
        };
    };

    async getBalances() {
        const response = await this.binance.accountInfo();

        let balances = {};
        response.balances.forEach(function(item, i) {
            const value = parseFloat(item.free);
            if (value === 0) return;
            balances[item.asset] = value;
        });

        return new Balances(balances);
    };

    async getTicker(pair) {
        const parsedPair = this.formatPair(pair);
        let response = await this.binance.dailyStats({symbol: parsedPair});

        return new Ticker(response.lastPrice, response.askPrice, response.bidPrice, pair);
    };

    async getOrderBook(pair) {
        const parsedPair = this.formatPair(pair);

        let response = await this.binance.book({symbol: parsedPair});

        //Parse to model data
        let bids = [];
        response.bids.forEach(function (item, i) {
            bids[i] = {
                rate: parseFloat(item.price),
                amount: parseFloat(item.quantity)
            };
        });

        //Parse to model data
        let asks = [];
        response.asks.forEach(function (item, i) {
            asks[i] = {
                rate: parseFloat(item.price),
                amount: parseFloat(item.quantity)
            };
        });

        return new OrderBook(bids, asks);
    };

    async getOrderStatus(id) {
        const parsedId = id.split("-")[1];
        const parsedPair = this.formatPair(id.split("-")[0]);
        const response = await this.binance.getOrder({symbol: parsedPair, orderId: parsedId});

        return new Order(
            id.split("-")[0],
            response.price,
            response.origQty,
            response.orderId,
            new Date(response.time),
            response.side.toLowerCase(),
            this.exchange,
            response.type.toLowerCase(),
            BINANCE_STATUSES(response.status)
        );
    };

    async getOrderHistory(pair, start, end) {
        const parsedPair = this.formatPair(pair);
        const response = await this.binance.allOrders({symbol: parsedPair, startTime: start.getTime(), endTime: end.getTime()});

        let orders = [];
        const exchange = this.exchange;
        response.forEach(function(item, i) {
            orders[i] = new Order(
                pair,
                item.price,
                item.origQty,
                item.orderId,
                new Date(item.time),
                item.side.toLowerCase(),
                exchange,
                item.type.toLowerCase(),
                BINANCE_STATUSES(item.status)
            );
        });

        return orders;
    };

    async getOpenOrders(pair) {
        let response;
        if (pair) {
            const parsedPair = this.formatPair(pair);
            response = await this.binance.openOrders({symbol: parsedPair});
        } else {
            response = await this.binance.openOrders();

            let symbols = [];

            response.forEach(function(item, i) {
                if (!symbols.includes(item.symbol))
                    symbols.push(item.symbol);
            });

            const symbolsF = await this.unformatPair(symbols);

            response.forEach(function(item, i) {
                item.symbol = symbolsF[item.symbol];
            })
        }

        let orders = {};
        const current = this;
        response.forEach(function(item, i) {
            if (pair) item.symbol = pair;
            if (!orders.hasOwnProperty(item.symbol)) orders[item.symbol] = [];
            orders[item.symbol].push(new Order(
                item.symbol,
                item.price,
                item.origQty,
                item.orderId,
                new Date(item.time),
                item.side.toLowerCase(),
                current.exchange,
                item.type.toLowerCase(),
                BINANCE_STATUSES(item.status))
            );
        });

        return orders;
    };

    formatPair(pair) {
        return pair.replace("_", "");
    }

    async unformatPair(pair) {
        if (!this.info) {
            this.info = await this.binance.exchangeInfo();
        } else {

            if (typeof pair === "string") {
                const item = this.info.symbols.find((orderInfo) => orderInfo.symbol === pair)
                return item.baseAsset + "_" + item.quoteAsset;
            } else if (pair.includes(item.symbol)) {
                let pairs = {};
                this.info.symbols.forEach(function (item, i) {
                    pairs[item.symbol] = item.baseAsset + "_" + item.quoteAsset;
                });
                return pairs;
            }

        }
    }
}

module.exports = BinanceConnector;
