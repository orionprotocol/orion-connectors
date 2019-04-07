const ExchangeOperation = require( "./exchange_operation" );

class Order extends ExchangeOperation {
    constructor(exchange, exchangeOrdId, symbol, side, price, qty, ordType = "LIMIT", timestamp, status = null) {
        super(symbol, side, price, qty);
        this.exchangeOrdId = exchangeOrdId.toString();
        this.ordType = ordType;
        this.exchange = exchange;
        this.timestamp = timestamp;
        this.status = status;
    }
}

module.exports = Order;
