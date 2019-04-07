const signalR = require('signalr-client');
const jsonic = require('jsonic');
const zlib = require('zlib');
const Order = require("../models/order");
const CryptoJS = require("crypto-js");
const Trade = require("../models/trade");
const Status = require("../models/status");

const JSON_keys = {
    "A" : "Ask",
    "a" : "Available",
    "B" : "Bid",
    "b" : "Balance",
    "C" : "Closed",
    "c" : "Currency",
    "CI" : "CancelInitiated",
    "D" : "Deltas",
    "d" : "Delta",
    "DT" : "OrderDeltaType",
    "E" : "Exchange",
    "e" : "ExchangeDeltaType",
    "F" : "FillType",
    "FI" : "FillId",
    "f" : "Fills",
    "G" : "OpenBuyOrders",
    "g" : "OpenSellOrders",
    "H" : "High",
    "h" : "AutoSell",
    "I" : "Id",
    "i" : "IsOpen",
    "J" : "Condition",
    "j" : "ConditionTarget",
    "K" : "ImmediateOrCancel",
    "k" : "IsConditional",
    "L" : "Low",
    "l" : "Last",
    "M" : "MarketName",
    "m" : "BaseVolume",
    "N" : "Nonce",
    "n" : "CommissionPaid",
    "O" : "Orders",
    "o" : "Order",
    "OT" : "OrderType",
    "OU" : "OrderUuid",
    "P" : "Price",
    "p" : "CryptoAddress",
    "PD" : "PrevDay",
    "PU" : "PricePerUnit",
    "Q" : "Quantity",
    "q" : "QuantityRemaining",
    "R" : "Rate",
    "r" : "Requested",
    "S" : "Sells",
    "s" : "Summaries",
    "T" : "TimeStamp",
    "t" : "Total",
    "TY" : "Type",
    "U" : "Uuid",
    "u" : "Updated",
    "V" : "Volume",
    "W" : "AccountId",
    "w" : "AccountUuid",
    "X" : "Limit",
    "x" : "Created",
    "Y" : "Opened",
    "y" : "State",
    "Z" : "Buys",
    "z" : "Pending"
};

const BITTREX_STATUSES = (status) => {
    switch(status) {
        case 0:
            return Status.NEW;
        case 1:
            return Status.PARTIALLY_FILLED;
        case 2:
            return Status.FILLED;
        case 3:
            return Status.CANCELED;
    }
};

const tempOrders = [];

class BittrexWebsocket {
    constructor(exchange, connector) {
        this.exchange = exchange;
        this.connector = connector;
    }

    subscribeToOrderUpdates(callback) {
        const context = this;
        const client = new signalR.client(
            'wss://beta.bittrex.com/signalr',
            ['c2']
        );

        client.serviceHandlers.connected = function(connection) {
            client.call('c2', 'GetAuthContext', context.exchange.apiKey).done(function(err, result) {
                const signature = context.createSignature(result, context.exchange.secretKey);
                client.call('c2', 'Authenticate', context.exchange.apiKey, signature).done(function (err, result) {
                    if (!err)
                        console.log("Successfully connected to bittrex authenticated websocket");
                    else
                        throw new Error("Can't connect to bittrex authenticated websocket");
                });
            });
        };

        client.serviceHandlers.messageReceived = function(message) {
            const data = jsonic (message.utf8Data);
            if (data.hasOwnProperty('M')) {
                if (data.M[0]) {
                    if (data.M[0].hasOwnProperty('M')) {
                        if ((data.M[0].M === "uO") && data.M[0].A[0]) {
                            //decode message
                            const b64 = data.M[0].A[0];
                            const raw = new Buffer.from(b64, 'base64');

                            zlib.inflateRaw(raw, function (err, inflated) {
                                if (!err) {
                                    const json = JSON.parse(inflated.toString('utf8'));
                                    const parsedJSON = context.unminifiedJSON(json);

                                    let date;
                                    if (parsedJSON.Order.Closed)
                                        date = new Date(parsedJSON.Order.Closed);
                                    else if (parsedJSON.Order.Updated)
                                        date = new Date(parsedJSON.Order.Updated);
                                    else if (parsedJSON.Order.Opened)
                                        date = new Date(parsedJSON.Order.Opened);
                                    else {
                                        date = new Date();
                                    }

                                    const status = BITTREX_STATUSES(parsedJSON.Type);

                                    if (status !== Status.NEW) {
                                        const prevQty = tempOrders[parsedJSON.Order.OrderUuid] || parsedJSON.Order.Quantity;
                                        const tradeQty = status !== Status.CANCELED ?
                                            prevQty - parsedJSON.Order.QuantityRemaining
                                            : 0;

                                        if (parsedJSON.Order.QuantityRemaining > 0) {
                                            tempOrders[parsedJSON.Order.OrderUuid] = parsedJSON.Order.QuantityRemaining;
                                        } else {
                                            delete tempOrders[parsedJSON.Order.OrderUuid];
                                        }

                                        callback(new Trade(
                                            context.exchange.id,
                                            parsedJSON.Order.OrderUuid,
                                            parsedJSON.Order.Id + '_' + parsedJSON.Nonce,
                                            parsedJSON.Order.PricePerUnit,
                                            tradeQty,
                                            status,
                                            date.getTime()));
                                    }
                                }
                            });
                        }
                    }
                }
            }
        };
    }

    unminifiedJSON(object) {
        const context = this;
        let unminified = {};

        //Skip not objects
        if (typeof(object) !== "object" || object === null || object === undefined) return object;

        //Brute force each item in object
        Object.keys(object).forEach(function(item, i) {
            if (typeof(object[item]) === "object")
                unminified[JSON_keys[item]] = context.unminifiedJSON(object[item]);
            else
                unminified[JSON_keys[item]] = object[item];
        });
        return unminified;
    }

    createSignature(challenge, secretKey) {
        return CryptoJS.HmacSHA512(challenge, secretKey).toString(CryptoJS.enc.Hex);
    }
}

module.exports = { BittrexWebsocket, BittrexStatuses: BITTREX_STATUSES};
