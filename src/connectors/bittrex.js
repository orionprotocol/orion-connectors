const Connector = require("./connector");
const Balances = require("../models/balances");
const Ticker = require("../models/ticker");
const OrderBook = require("../models/order_book");
const Order = require("../models/order");
const { BittrexClient } = require("bittrex-node");
const BittrexWebsocket = require("./bittrex_websocket");
const rp = require("request-promise");

class BittrexConnector extends Connector{
    constructor(exchange) {
        super();
        this.bittrex = new BittrexClient({apiKey: exchange.apiKey, apiSecret: exchange.secretKey});
        this.websocket = new BittrexWebsocket(exchange);
        this.exchange = exchange;
        this.publicApi = "https://bittrex.com/api/v1.1";
        this.marketApi = "https://bittrex.com/api/v1.1";
        this.accountApi = "https://bittrex.com/api/v1.1";
    }

    async submitOrder(order) {
        let response;

        if (order.side === "buy")
            response = await this.bittrex.buyLimit(order.pair, {quantity: order.amount, rate: order.rate});
        else if (order.side === "sell")
            response = await this.bittrex.sellLimit(order.pair, {quantity: order.amount, rate: order.rate});

        return await this.getOrderStatus(response.uuid);
    };

    async cancelOrder(order) {
        let response = await this.bittrex.cancelOrder(order.id);

        return {
            message: "Successfully cancel order(" + order.id + ") from " + this.exchange.id + " exchange",
            id: order.id
        };
    };

    async getBalances() {
        let response = await this.bittrex.balances();

        let balances = {};
        response.forEach(function(item, i) {
            balances[item.Currency] = item.Balance;
        });

        return new Balances(balances);
    };

    async getTicker(pair) {
        const parsedPair = this.formatPair(pair);
        const response = await this.bittrex.ticker(parsedPair);

        return new Ticker(response.Last, response.Ask, response.Bid, pair);
    };

    async getOrderBook(pair) {
        const parsedPair = this.formatPair(pair);

        let response = await this.bittrex.orderBook(parsedPair);

        //Parse to model data
        let bids = [];
        response.sell.forEach(function (item, i) {
            bids[i] = {
                rate: parseFloat(item.Rate),
                amount: parseFloat(item.Quantity)
            };
        });

        //Parse to model data
        let asks = [];
        response.buy.forEach(function (item, i) {
            asks[i] = {
                rate: parseFloat(item.Rate),
                amount: parseFloat(item.Quantity)
            };
        });

        return new OrderBook(bids, asks);
    };

    async getOrderStatus(id) {

        const params = {
            uuid: id
        };

        let response = await this.bittrex.request("GET", "/account/getorder", {headers: undefined, params : params});

        if (!response) throw new Error("Can't get order");

        const pair = this.unformatPair(response.Exchange);
        const rate = response.Limit;
        const amount = response.Quantity;
        const status = response.IsOpen?"opened":(response.Closed)?"closed":"fillable"; //I have doubts
        const time = new Date(response.Opened);
        const side = response.Type.split("_")[1].toLowerCase();

        return new Order(
            pair,
            rate,
            amount,
            id,
            time,
            side,
            this.exchange,
            undefined,
            status
        );
    };

    async getOrderHistory(pair, start, end) {
        const parsedPair = this.formatPair(pair);
        const response = await this.bittrex.orderHistory(parsedPair);

        let orders = [];
        response.forEach(function(item, i) {
            let ts = Date.parse(item.TimeStamp);
            if (ts < (start.getTime()/1000 | 0) || ts > (end.getTime()/1000 | 0)) return;
            orders[i] = new Order(
                pair,
                item.Limit,
                item.Quantity,
                item.OrderUuid,
                new Date(item.TimeStamp),
                item.OrderType.split("_")[1].toLowerCase(),
                this.exchange,
                item.OrderType.split("_")[0].toLowerCase(),
                undefined
            );
        });

        return orders;
    };

    async getOpenOrders(pair) {
        let response;
        if (pair) {
            const parsedPair = this.formatPair(pair);
            response = await this.bittrex.openOrders(parsedPair);
        } else {
            response = await this.bittrex.request('get', '/market/getopenorders');
        }

        let orders = {};
        const current = this;
        response.forEach(function(item, i) {
            if (!orders.hasOwnProperty(item.Exchange)) orders[current.unformatPair(item.Exchange)] = [];
            orders[current.unformatPair(item.Exchange)].push(new Order(
                current.unformatPair(item.Exchange),
                item.Limit,
                item.Quantity,
                item.OrderUuid,
                new Date(item.Opened),
                item.OrderType.split("_")[1].toLowerCase(),
                current.exchange,
                item.OrderType.split("_")[0].toLowerCase(),
                item.Closed?"closed":(item.Quantity === item.QuantityRemaining?"opened":"fillable")
            ));
        });

        return orders;
    };

    formatPair(pair) {
        return pair.replace("_", "-");
    }

    unformatPair(pair) {
        return pair.replace("-", "_");
    }
}

module.exports = BittrexConnector;
