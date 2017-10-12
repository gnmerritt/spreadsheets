function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Account actions')
    .addItem('Log a deposit', 'contribute')
    .addSeparator()
    .addItem('Record current balance', 'populateBalance')
    .addToUi();
}

function contribute() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Log a deposit', 'How much did you deposit?', ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() === ui.Button.OK) {
    var ss = SpreadsheetApp.getActive();
    var amount = response.getResponseText();
    try {
      var deposit = parseInt(amount, 10);
      if (!deposit) return;
      var cashRange = ss.getRangeByName("cash");
      var newAvailableCash = cashRange.getValue() + deposit;
      cashRange.setValue(newAvailableCash);
      populateBalance(deposit);
    } catch (e) {
      ui.alert("Couldn't handle that amount " + e);
    }
  }
}

function populateBalanceCron() {
  populateBalance(0); // google puts dumb things into arguments, make sure they don't affect us
}

function populateBalance(cashflow) {
  if (!cashflow) cashflow = 0;
  var ss = SpreadsheetApp.getActive();
  var balanceCell = ss.getRangeByName("currentBalance");
  var balance = balanceCell.getCell(1, 1).getValue();

  var ledger = ss.getSheetByName("ledger");
  // loop until we find the first row with an empty date
  for (var insertRow = 1; ledger.getRange(insertRow, 1).getValue(); insertRow++) {
  }

  // insert today's date, cashflow & the balance on the empty row
  ledger.getRange(insertRow, 1).setValue(new Date());
  ledger.getRange(insertRow, 2).setValue(cashflow);
  ledger.getRange(insertRow, 4).setValue(balance);
}

function calculateNeeded(symbol) {
  const SYMBOL = 1;
  const BALANCED = 4;
  const ACTUAL = 5;
  const DELTA = 6;
  const PRICE = 8;

  const ss = SpreadsheetApp.getActive();
  const data = ss.getRangeByName("data");

  const stocks = [];

  for (var i = 1; i <= data.getNumRows(); i++) {
    var stock = {
      ticker: data.getCell(i, SYMBOL).getValue(),
      price: data.getCell(i, PRICE).getValue(),
      current: data.getCell(i, ACTUAL).getValue(),
      balanced: data.getCell(i, BALANCED).getValue(),
      delta: data.getCell(i, DELTA).getValue(),
      needed: 0
    };
    stocks.push(stock);
  }

  var toSpend = ss.getRangeByName("cash").getValue();
  // spend available funds on new investments until we can't anymore
  for (var s = prioritize(stocks, toSpend); s; s = prioritize(stocks, toSpend)) {
    s.needed = s.needed + 1;
    s.current = s.current + s.price;
    s.delta = s.current - s.balanced;
    toSpend -= s.price;
    Logger.log('spent ' + s.price + ' on ' + s.ticker + ' and have left ' + toSpend);
  }

  // this same function runs for every row, return the # needed for the current row
  for (var i = 0; i < stocks.length; i++) {
    var s2 = stocks[i];
    if (s2.ticker === symbol) return s2.needed;
  }
}

/**
 * Given our current portfolio and an amount available to spend, calculate the next
 * stock to buy one share of.
 */
function prioritize(stocks, toSpend) {
  // first buy any stocks we're whole shares under on, most expensive first
  const needMore = [];
  for (var i = 0; i < stocks.length; i++) {
    var s = stocks[i];
    var wholeSharesUnder = Math.floor(-s.delta / s.price);
    if (wholeSharesUnder > 0) needMore.push(s);
  }
  needMore.sort(function(a, b) { return b.price - a.price }); // descending on price
  const fromNeedMore = firstAffordable(needMore, toSpend);
  if (fromNeedMore) return fromNeedMore;

  // now buy whatever we're the furthest off % wise from our target allocation
  const unbalanced = stocks.slice();
  unbalanced.sort(function(a, b) { return percentDiv(a) - percentDiv(b) }); // ascending on % div
  return firstAffordable(unbalanced, toSpend);
}

function percentDiv(s) {
  return (s.current - s.balanced) / s.balanced;
}

function firstAffordable(prioritized, toSpend) {
  for (var i = 0; i < prioritized.length; i++) {
    var s = prioritized[i];
    if (s.price <= toSpend) return s;
  }
}
