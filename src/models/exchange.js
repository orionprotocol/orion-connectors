class Exchange {
    constructor( id, apiKey, secretKey, balances) {
        this.id = id.toLowerCase();
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.balances = balances;
    }
}

module.exports = Exchange;
