const Order = require("../models/order");
const Trade = require("../models/trade");
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

class BinanceWebsocket {
    constructor(exchange, binance) {
        this.exchange = exchange;
        this.binance = binance;
    }

    subscribeToOrderUpdates(callback) {
        const context = this;
        //Reconnect after 24 hour of connection
        setTimeout(function() {
            context.subscribeToOrderUpdates(callback);
        }, 24*59*60*1000);
        this.binance.ws.user(async message => {
            if (message.hasOwnProperty("eventType")
                && message.eventType === "executionReport"
                && (message.executionType === "TRADE" || message.executionType === "CANCELED")) {

                const status = BINANCE_STATUSES(message.orderStatus);

                const trade = new Trade(
                    this.exchange.id,
                    message.orderId,
                    message.tradeId,
                    message.price,
                    status === Status.CANCELED ? 0 : message.quantity,
                    BINANCE_STATUSES(message.orderStatus),
                    message.eventTime);

                callback(trade);
                /*callback(new Order(
                    message.symbol,
                    message.price,
                    message.quantity,
                    message.orderId,
                    date,
                    message.side.toLowerCase(),
                    this.exchange,
                    message.orderType.toLowerCase(),
                    BINANCE_STATUSES(message.orderStatus)), BINANCE_STATUSES(message.orderStatus));*/
            }
        })
    }
}

module.exports = BinanceWebsocket;