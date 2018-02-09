// fetches the USD exchange rate for a crypto coin e.g. 'BTC' or 'ETH'. Relies on
// a 'btcCell' to trigger refreshes - btcCell contains the formula '=GOOGLEFINANCE("BTCUSD")'
//
// usage: '=getTickerUSD(B2, F$26)'

var IPHONE = "Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_3_3 like Mac OS X; en-us) AppleWebKit/533.17.9 (KHTML, like Gecko) Version/5.0.2 Mobile/8J2 Safari/6533.18.5";

function getTickerUSD(ticker, btcCell, retry) {
  var url = "https://api.cryptonator.com/api/ticker/" + ticker.toLowerCase() + "-usd";
  try {
    var response = UrlFetchApp.fetch(url, {'headers': {'User-Agent': IPHONE}});
    var text = response.getContentText();
    var json = JSON.parse(text);
    if (!json.success) {
      throw "No sucess boolean from cryptonator";
    }
    return json.ticker.price;
  } catch (e) {
    if (!retry) {
      return getTickerUSD(ticker, btcCell, true);
    }
    return null;
  }
}
