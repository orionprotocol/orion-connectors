class Connector {
    /**
     * Used to place a buy or sell order
     * @param pair: String, e.g. - BTC_ETH
     * @param side: String, e.g. - buy | sell
     * @param ordQty: Number
     * @param price: Number
     * @returns {Promise<Map<String, Order>>}
     */
    async submitOrder(pair, side, ordQty, price) {};

    /**
     * Used to cancel opened order
     * @param orders: Array, e.g. - [bittrex: <Order>, binance: <Order>, poloniex: <Order>]
     * @returns {Promise<Map<String, String>>}
     */
    async cancelOrder(orders) {};

    /**
     * Used to get nonzero balances
     * @returns {Promise<Map<String, Balances>>}
     */
    async getBalances() {};

    /**
     * Used to get ticker
     * @param pair: String, e.g. - BTC_ETH
     * @returns {Promise<Map<String, Ticker>>}
     */
    async getTicker(pair) {};

    /**
     * Used to get order book
     * @param pair: String, e.g. - BTC_ETH
     * @returns {Promise<Map<String, OrderBook>>}
     */
    async getOrderBook(pair) {};

    /**
     * Used to get full info about each order
     * @param ids: Object, e.g. - {binance: orderId, poloniex: orderId, bittrex: orderId}
     * @returns {Promise<Map<String, Order>>}
     */
    async getOrderStatus(ids) {};

    /**
     * Used to get order history in a start to end time-frame
     * @param pair: String, e.g. - BTC_ETH
     * @param start: Date
     * @param end: Date
     * @returns {Promise<Map<String, Array<Order>>>}
     */
    async getOrderHistory(pair, start, end) {};

    /**
     * Used to get all open orders in specified account
     * @param pair
     * @returns {Promise<Map<String, Array<Order>>>}
     */
    async getOpenOrders(pair) {};
}

module.exports = Connector;
