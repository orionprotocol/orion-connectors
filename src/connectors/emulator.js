const Connector = require("./connector");
const Order = require("../models/order");
const rp = require("request-promise");
const EmulatorWebsocket = require("./emulator_websocket");
const Status = require("../models/status");
const uuid = require('uuid/v1');

class EmulatorConnector extends Connector{
    constructor(exchange) {
        super();
        this.websocket = new EmulatorWebsocket(exchange);
        this.exchange = exchange;
        this.balances = exchange.balances;
    }


    async submitOrder(order) {
        order.price = order.price.toFixed(7);
        const xchgOrder =  new Order(
            this.exchange.id,
            uuid(),
            order.symbol,
            order.side,
            order.price,
            order.qty,
            "LIMIT",
            new Date().getTime(),
            Status.NEW);
        this.websocket.sendFilledTrade(xchgOrder);
        return xchgOrder;
    };

    async cancelOrder(order) {
        return {
            message: "Successfully cancel order(" + order.exchangeOrdId + ") from " + order.exchange + " exchange",
            id: order.id
        };
    };

    async getBalances() {
        return this.balances;
    };

    async getTicker(pair) {
        throw new Error("getTicker unimplemented for emulator");
    };

    async getOrderBook(pair) {
        throw new Error("getTicker unimplemented for emulator");
    };

    async getOrderStatus(id) {

    };

    async getOrderHistory(pair, start, end) {

    };

    async getOpenOrders(pair) {

    };
}

module.exports = EmulatorConnector;
