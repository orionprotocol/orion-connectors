const Order = require("../models/order");
const Trade = require("../models/trade");
const Status = require("../models/status");
const uuid = require('uuid/v1');

class EmulatorWebsocket {
    constructor(exchange) {
        this.exchange = exchange;
    }

    subscribeToOrderUpdates(callback) {
        this.callback = callback;
    }

    sendFilledTrade(order) {
        setTimeout(() => {
            const trade = new Trade(
                this.exchange.id,
                order.exchangeOrdId,
                uuid(),
                order.price,
                order.qty,
                Status.FILLED,
                new Date().getTime());

            this.callback(trade);
        }, 100);
    }
}

module.exports = EmulatorWebsocket;