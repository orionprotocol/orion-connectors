class Trade {
    constructor(exchange, exchangeOrdId, tradeId, price, qty, status, timestamp) {
        this.exchange = exchange;
        this.exchangeOrdId = exchangeOrdId;
        this.tradeId = tradeId;
        this.price = price;
        this.qty = qty;
        this.status = status;
        this.timestamp = timestamp
    }
}

module.exports = Trade;
