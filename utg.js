const Connector = require("./src/connectors/connector");
const PoloniexConnector = require("./src/connectors/poloniex");
const BittrexConnector = require("./src/connectors/bittrex");
const BinanceConnector = require("./src/connectors/binance");
const Exchange = require("./src/models/exchange");
const ExchangeOperation = require("./src/models/exchange_operation");
const Order = require("./src/models/order");

const Exchanges = {
    POLONIEX: 'poloniex',
    BINANCE: 'binance',
    BITTREX: 'bittrex'
};

const AVAILABLE_CONNECTORS = {
    [Exchanges.POLONIEX]: function(exchange) {
        return new PoloniexConnector(exchange);
    },
    [Exchanges.BITTREX]: function(exchange) {
        return new BittrexConnector(exchange);
    },
    [Exchanges.BINANCE]: function(exchange) {
        return new BinanceConnector(exchange);
    }
};

class UTG extends Connector{
    constructor(exchanges) {
        super(exchanges);
        let exchangesList = {};
        for (let exchange in exchanges) {
            const item = exchanges[exchange];
            exchangesList[exchange] = new Exchange(exchange, item.key, item.secret);
        }
        this.exchanges = exchangesList;
    }

    async submitOrder(pair, side, ordQty, price) {
        const headers = new Headers({
            'Accept': 'application/json',
            'X-HLV-KEY': '',
            'X-HLV-SIGNATURE': ''
        }), url = "https://beta.orionprotocol.io/api/order-route?symbol=" + pair + "&side=" + side + "&ordQty=" + ordQty + (price?"&price=" + price:"");

        const result = await fetch(url, {headers})
            .then((response) => response.json())
            .then((result) => {
                if (result.hasOwnProperty("message")) throw new Error(result.message);

                let response = [];
                result.forEach((order, i) => {
                    response.push({
                        symbol: order.symbolExchange?order.symbolExchange:order.symbol,
                        exchangeId: order.exchangeId,
                        price: order.price,
                        subOrdQty: order.ordQty
                    })
                });
                return response})
            .catch((error) => {
                throw error;
            });

        let orders = {};
        let promises = [];

        const current = this;
        result.forEach(async function(item, i) {
            //Skip unavailable exchange
            if (current.exchanges[item.exchangeId] === undefined) orders[i] = "Can't send private requests to " + item.exchangeId + " exchange";

            const connector = AVAILABLE_CONNECTORS[item.exchangeId](current.exchanges[item.exchangeId]);
            const order = new ExchangeOperation(side, item.symbol, item.price, item.subOrdQty);
            promises.push(
                connector.submitOrder(order)
                    .then(data => current.resolve(data, item.exchangeId))
                    .catch(error => current.reject(error, item.exchangeId))
            );
        });

        (await Promise.all(promises)).forEach(response => orders[response.exchangeId] = response);

        return orders;
    };

    async cancelOrder(orders) {
        let messages =  {};
        let promises = [];

        const current = this;

        orders.forEach((order, i) => {
            const exchange = order.exchange;
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](current.exchanges[exchange]);

                promises.push(
                    connector.cancelOrder(order)
                        .then(data => current.resolve(data, exchange))
                        .catch(error => current.reject({error, id: order.id}, exchange))
                );
            }
        });

        (await Promise.all(promises)).forEach(response => messages[response.exchangeId] = response);

        return messages;
    };
    async getBalances() {
        let balances = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                promises.push(
                    connector.getBalances()
                        .then(data => this.resolve(data, exchange))
                        .catch(error => this.reject(error, exchange))
                );
            }
        }

        (await Promise.all(promises)).forEach(response => balances[response.exchangeId] = response);

        return balances;
    };
    async getTicker(pair) {
        if (pair === null || pair === undefined) throw new Error("INVALID_MARKET");
        let tickers = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                promises.push(
                    connector.getTicker(pair)
                        .then(data => this.resolve(data, exchange))
                        .catch(error => this.reject(error, exchange))
                );
            }
        }

        (await Promise.all(promises)).forEach(response => tickers[response.exchangeId] = response);

        return tickers;
    };
    async getOrderBook(pair) {
        if (pair === null || pair === undefined) throw new Error("INVALID_MARKET");
        let orders = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                promises.push(
                    connector.getOrderBook(pair)
                        .then(data => this.resolve(data, exchange))
                        .catch(error => this.reject(error, exchange))
                );
            }
        }

        (await Promise.all(promises)).forEach(response => orders[response.exchangeId] = response);

        return orders;
    };
    async getOrderStatus(ids) {
        if (ids === null || ids === undefined) throw new Error("INVALID_IDENTIFIERS");
        let orders = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                if (ids.hasOwnProperty(exchange)) {
                    promises.push(
                        connector.getOrderStatus(ids[exchange])
                            .then(data => this.resolve(data, exchange))
                            .catch(error => this.reject(error, exchange))
                    );
                }
            }
        }

        (await Promise.all(promises)).forEach(response => orders[response.exchangeId] = response);

        return orders;
    };
    async getOrderHistory(pair, start, end) {
        if (pair === null || pair === undefined) throw new Error("INVALID_MARKET");
        if (start === null || start === undefined) throw new Error("INVALID_START_TIME");
        if (end === null || end === undefined) throw new Error("INVALID_END_TIME");

        let orders = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                promises.push(
                    connector.getOrderHistory(pair, start, end)
                        .then(data => this.resolve(data, exchange))
                        .catch(error => this.reject(error, exchange))
                );
            }
        }

        (await Promise.all(promises)).forEach(response => orders[response.exchangeId] = response);

        return orders;
    };
    async getOpenOrders(pair) {
        let orders = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                promises.push(
                    connector.getOpenOrders(pair)
                        .then(data => this.resolve(data, exchange))
                        .catch(error => this.reject(error, exchange))
                );
            }
        }

        (await Promise.all(promises)).forEach(response => orders[response.exchangeId] = response);

        return orders;
    };

    resolve(data, exchange) {
        return {
            exchangeId: exchange,
            success: true,
            result: data
        };
    }

    reject(data, exchange) {
        return {
            exchangeId: exchange,
            success: false,
            result: data
        };
    }

    orderWatcher(callback) {
        for (let exchange in this.exchanges) {
            if (AVAILABLE_CONNECTORS.hasOwnProperty(exchange)) {
                const connector = AVAILABLE_CONNECTORS[exchange](this.exchanges[exchange]);

                connector.websocket.subscribeToOrderUpdates(callback);
            }
        }
    }
}

module.exports = {UTG, Exchanges, ExchangeOperation, Order};
