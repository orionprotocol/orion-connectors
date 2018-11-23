const ExchangeOperation = require( "./exchange_operation" );

class Order extends ExchangeOperation {
    constructor( pair, rate, amount, id, time, side, exchange, type = "limit", status = null ) {
        super( side, pair, rate, amount );
        this.id = id.toString();
        this.time = time;
        this.exchange = exchange;
        this.type = type;
        this.status = status;
    }
}

module.exports = Order;
