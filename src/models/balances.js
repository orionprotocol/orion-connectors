class Balances {
    constructor( balances ) {
        for ( let balance in balances ) {
            this[ balance ] = parseFloat( balances[ balance ] );
        }
    }
}

module.exports = Balances;
