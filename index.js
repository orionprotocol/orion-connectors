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

const CONNECTORS_FACTORY = {
    [Exchanges.POLONIEX]: function(exchange) {
        return exchange.apiKey === "emulator" ? new EmulatorConnector(exchange) : new PoloniexConnector(exchange);
    },
    [Exchanges.BITTREX]: function(exchange) {
        return exchange.apiKey === "emulator" ? new EmulatorConnector(exchange) : new BittrexConnector(exchange);
    },
    [Exchanges.BINANCE]: function(exchange) {
        return exchange.apiKey === "emulator" ? new EmulatorConnector(exchange) : new BinanceConnector(exchange);
    }
};

class Connectors extends Connector{

    constructor(exchanges) {
        super(exchanges);
        let exchangesList = {};
        let connectors = {};
        for (let id in exchanges) {
            if (exchanges.hasOwnProperty(id)) {
                const item = exchanges[id];
                exchangesList[id] = new Exchange(id, item.key, item.secret, item.balances);
                connectors[id] = CONNECTORS_FACTORY[id](exchangesList[id]);
            }
        }
        this.exchanges = exchangesList;
        this.availableConnectors = connectors;
    }

    async createOrder(exchangeId, symbol, side, subOrdQty, price) {
        const connector = this.availableConnectors[exchangeId];

        if (connector === undefined)
            return Promise.reject("Can't send private requests to " + exchangeId + " exchange");

        const order = new ExchangeOperation(symbol, side , price, subOrdQty);

        return connector.submitOrder(order);
    };


    async cancelOrder(orders) {
        let messages =  {};
        let promises = [];

        const current = this;

        orders.forEach((order, i) => {
            const exchange = order.exchange;
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

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
        let promises = [];

        for (let exchange in this.exchanges) {
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

                promises.push(
                    connector.getBalances()
                        .then(data => this.resolve(data, exchange))
                        .catch(error => this.reject(error, exchange))
                );
            }
        }

        return Promise.all(promises).then(all => {
            let balances = {};
            all.forEach(response => balances[response.exchangeId] = response.result);
            return balances;
        });
    };
    async getTicker(pair) {
        if (pair === null || pair === undefined) throw new Error("INVALID_MARKET");
        let tickers = {};
        let promises = [];

        for (let exchange in this.exchanges) {
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

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
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

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
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

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
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

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
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

                promises.push(
                    OrderService.getOpenOrders(pair)
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
            if (this.availableConnectors.hasOwnProperty(exchange)) {
                const connector = this.availableConnectors[exchange];

                connector.websocket.subscribeToOrderUpdates(callback);
            }
        }
    }
}

module.exports = { Connectors, Exchanges, ExchangeOperation, Order };
