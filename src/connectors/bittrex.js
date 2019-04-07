const Connector = require("./connector");
const Balances = require("../models/balances");
const Ticker = require("../models/ticker");
const OrderBook = require("../models/order_book");
const Order = require("../models/order");
const { BittrexClient } = require("bittrex-node");
const { BittrexWebsocket, BittrexStatuses } = require("./bittrex_websocket");
const rp = require("request-promise");
const Status = require("../models/status");

class BittrexConnector extends Connector{
    constructor(exchange) {
        super();
        this.bittrex = new BittrexClient({apiKey: exchange.apiKey, apiSecret: exchange.secretKey});
        this.websocket = new BittrexWebsocket(exchange, this);
        this.exchange = exchange;
        this.publicApi = "https://bittrex.com/api/v1.1";
        this.marketApi = "https://bittrex.com/api/v1.1";
        this.accountApi = "https://bittrex.com/api/v1.1";
    }

    static convertToBittrexSymbol(symbol) {
        const assets = symbol.split('-');
        return `${assets[1]}-${assets[0]}`;
    }

    static unformatPair(pair) {
        const assets = pair.split('-');
        return `${assets[1]}-${assets[0]}`;
    }

    async submitOrder(order) {
        let response;

        const bittrexSymbol = BittrexConnector.convertToBittrexSymbol(order.symbol);

        if (order.side === "buy")
            response = await this.bittrex.buyLimit(bittrexSymbol, {quantity: order.qty, rate: order.price});
        else if (order.side === "sell")
            response = await this.bittrex.sellLimit(bittrexSymbol, {quantity: order.qty, rate: order.price});

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

        const symbol = BittrexConnector.unformatPair(response.Exchange);
        const rate = response.Limit;
        const amount = response.Quantity;
        const status = Status.NEW;
        const time = new Date(response.Opened).getTime();
        const side = response.Type.split("_")[1].toLowerCase();

        return new Order(
            this.exchange.id,
            id,
            symbol,
            side,
            rate,
            amount,
            "LIMIT",
            time,
            status);
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
            if (!orders.hasOwnProperty(item.Exchange)) orders[BittrexConnector.unformatPair(item.Exchange)] = [];
            orders[BittrexConnector.unformatPair(item.Exchange)].push(new Order(
                BittrexConnector.unformatPair(item.Exchange),
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

}

module.exports = { BittrexConnector };
