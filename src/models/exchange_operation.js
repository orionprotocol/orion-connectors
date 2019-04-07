class ExchangeOperation {
    constructor(symbol, side, price, qty) {
        this.symbol = symbol;
        this.side = side;
        this.price = parseFloat(price);
        this.qty = parseFloat(qty);
    }
}

module.exports = ExchangeOperation;
