class ExchangeOperation {
    constructor( side, pair, rate, amount ) {
        this.side = side;
        this.pair = pair;
        this.rate = parseFloat( rate );
        this.amount = parseFloat( amount );
    }
}

module.exports = ExchangeOperation;
