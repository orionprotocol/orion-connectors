class Ticker {
    constructor( last, ask, bid, pair ) {
        this.last = parseFloat( last );
        this.ask = parseFloat( ask );
        this.bid = parseFloat( bid );
        this.pair = pair;
    }
}

module.exports = Ticker;
