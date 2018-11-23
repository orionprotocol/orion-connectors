class Exchange {
    constructor( id, apiKey, secretKey ) {
        this.id = id.toLowerCase();
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }
}

module.exports = Exchange;
