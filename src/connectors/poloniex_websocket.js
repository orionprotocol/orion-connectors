const Order = require("../models/order");
const CryptoJS = require("crypto-js");
let WebSocket = require('ws');
const Trade = require("../models/trade");
const Status = require("../models/status");

const CURRENCY_PAIR_LIST = {
    7: "BTC_BCN",
    14: "BTC_BTS",
    15: "BTC_BURST",
    20: "BTC_CLAM",
    25: "BTC_DGB",
    27: "BTC_DOGE",
    24: "BTC_DASH",
    38: "BTC_GAME",
    43: "BTC_HUC",
    50: "BTC_LTC",
    51: "BTC_MAID",
    58: "BTC_OMNI",
    61: "BTC_NAV",
    64: "BTC_NMC",
    69: "BTC_NXT",
    75: "BTC_PPC",
    89: "BTC_STR",
    92: "BTC_SYS",
    97: "BTC_VIA",
    100: "BTC_VTC",
    108: "BTC_XCP",
    114: "BTC_XMR",
    116: "BTC_XPM",
    117: "BTC_XRP",
    112: "BTC_XEM",
    148: "BTC_ETH",
    150: "BTC_SC",
    155: "BTC_FCT",
    162: "BTC_DCR",
    163: "BTC_LSK",
    167: "BTC_LBC",
    168: "BTC_STEEM",
    170: "BTC_SBD",
    171: "BTC_ETC",
    174: "BTC_REP",
    177: "BTC_ARDR",
    178: "BTC_ZEC",
    182: "BTC_STRAT",
    184: "BTC_PASC",
    185: "BTC_GNT",
    189: "BTC_BCH",
    192: "BTC_ZRX",
    194: "BTC_CVC",
    196: "BTC_OMG",
    198: "BTC_GAS",
    200: "BTC_STORJ",
    201: "BTC_EOS",
    204: "BTC_SNT",
    207: "BTC_KNC",
    210: "BTC_BAT",
    213: "BTC_LOOM",
    221: "BTC_QTUM",
    232: "BTC_BNT",
    229: "BTC_MANA",
    121: "USDT_BTC",
    216: "USDT_DOGE",
    122: "USDT_DASH",
    123: "USDT_LTC",
    124: "USDT_NXT",
    125: "USDT_STR",
    126: "USDT_XMR",
    127: "USDT_XRP",
    149: "USDT_ETH",
    219: "USDT_SC",
    218: "USDT_LSK",
    173: "USDT_ETC",
    175: "USDT_REP",
    180: "USDT_ZEC",
    217: "USDT_GNT",
    191: "USDT_BCH",
    220: "USDT_ZRX",
    203: "USDT_EOS",
    206: "USDT_SNT",
    209: "USDT_KNC",
    212: "USDT_BAT",
    215: "USDT_LOOM",
    223: "USDT_QTUM",
    234: "USDT_BNT",
    231: "USDT_MANA",
    129: "XMR_BCN",
    132: "XMR_DASH",
    137: "XMR_LTC",
    138: "XMR_MAID",
    140: "XMR_NXT",
    181: "XMR_ZEC",
    166: "ETH_LSK",
    169: "ETH_STEEM",
    172: "ETH_ETC",
    176: "ETH_REP",
    179: "ETH_ZEC",
    186: "ETH_GNT",
    190: "ETH_BCH",
    193: "ETH_ZRX",
    195: "ETH_CVC",
    197: "ETH_OMG",
    199: "ETH_GAS",
    202: "ETH_EOS",
    205: "ETH_SNT",
    208: "ETH_KNC",
    211: "ETH_BAT",
    214: "ETH_LOOM",
    222: "ETH_QTUM",
    233: "ETH_BNT",
    230: "ETH_MANA",
    224: "USDC_BTC",
    226: "USDC_USDT",
    225: "USDC_ETH"
};

const POLONIEX_STATUSES = (status) => {
    switch(status) {
        case "Open":
            return Status.NEW;
        case "Partially filled":
            return Status.PARTIALLY_FILLED;
        case "Cancelled":
            return Status.CANCELED;
        default:
            return Status.FILLED;
    }
};

class PoloniexWebsocket {
    constructor(exchange, poloniex) {
        this.exchange = exchange;
        this.poloniex = poloniex;
    }

    subscribeToOrderUpdates(callback) {
        //Connect to websocket
        const socket = new WebSocket('wss://api2.poloniex.com');
        const current = this;

        socket.onopen = function () {
            console.log("Successfully connected to poloniex authenticated websocket");
            const payload = "nonce=" + (new Date()).getTime();
            const sign = current.createSignature(payload, current.exchange.secretKey);
            socket.send(JSON.stringify({ command: 'subscribe', channel: 1000, key: current.exchange.apiKey, payload, sign}));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (Array.isArray(data) && data[0] === 1000 && data.length >= 3) {
                data[2].forEach(function(event, i) {
                    if (event[0] === "t") {
                        callback(new Trade(
                            current.exchange.id,
                            event[6],
                            event[1],
                            event[2],
                            event[3],
                            null,
                            new Date().getTime()));

                    } else if (event[0] === "o") {
                        if (parseFloat(event[2]) === 0) {
                            current.poloniex.returnOrderTrades(event[1])
                                .catch((err) => {
                                    if (!err.code) {
                                        callback(new Trade(
                                            current.exchange.id,
                                            event[1],
                                            event[1],
                                            0,
                                            0,
                                            Status.CANCELED,
                                            new Date().getTime()));
                                    }
                                });

                        }
                    }
                })
            }
        };

        socket.onerror = function(error) {
            console.log('Error from server', error);
        };
    }

    createSignature(payload, secretKey) {
        return CryptoJS.HmacSHA512(payload, secretKey).toString(CryptoJS.enc.Hex);
    }
}

module.exports = PoloniexWebsocket;