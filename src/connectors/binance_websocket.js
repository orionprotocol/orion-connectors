const Order = require("../models/order");

const BINANCE_STATUSES = (status) => {
    switch(status) {
        case "NEW":
            return "opened";
        case "PARTIALLY_FILLED":
            return "fillable";
        case "FILLED":
        case "CANCELED":
        case "REJECTED":
        case "EXPIRED":
            return "closed";
    }
};

class BinanceWebsocket {
    constructor(exchange, binance) {
        this.exchange = exchange;
        this.binance = binance;
    }

    subscribeToOrderUpdates(callback) {
        //Reconnect after 24 hour of connection
        setTimeout(function() {
            context.subscribeToOrderUpdates(callback);
        }, 86364000);
        this.binance.ws.user(async message => {
            if (message.hasOwnProperty("eventType") && message.eventType === "executionReport") {
                const info = await this.binance.exchangeInfo();
                info.symbols.forEach(function(item, i) {
                    if (item.symbol === message.symbol) {
                        message.symbol = item.baseAsset + "_" + item.quoteAsset;
                    }
                });

                let date;
                if (message.creationTime > message.eventTime)
                    date = new Date(message.creationTime);
                else
                    date = new Date(message.eventTime);

                callback(new Order(
                    message.symbol,
                    message.price,
                    message.quantity,
                    message.orderId,
                    date,
                    message.side.toLowerCase(),
                    this.exchange,
                    message.orderType.toLowerCase(),
                    BINANCE_STATUSES(message.orderStatus)), BINANCE_STATUSES(message.orderStatus));
            }
        })
    }
}

module.exports = BinanceWebsocket;