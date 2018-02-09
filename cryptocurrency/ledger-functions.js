// These functions power an auto collecting time-series spreadsheet of prices and
// the fund's balance.
//
// Structure for the google sheet:
//
// 'exchanges' sheet which contains rows of symbols along w/ their current USD values
// 'dashboard' sheet which contains the fund's current balance, named range 'currentBalance'
//
// 'ledger' sheet which contains fund's value over time
// 'historical' sheet which contains cryptocoin values in USD over time
//
// Two functions are hooked up to hourly triggers in order to advance the sheet
// over time: populateBalanceCron and populateDataRow

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Account actions')
    .addItem('Record current balance', 'populateBalance')
    .addItem('Save exchanges to data file', 'populateDataRow')
    .addToUi();
}

function refreshSheet() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName("exchanges");
  var dataArrayRange = sheet.getRange(1,1,sheet.getLastRow(),sheet.getLastColumn());

  var nanFound = true;
  while(nanFound) {
    var dataArray = dataArrayRange.getValues(); // necessary to refresh custom functions

    for(var i = 0; i < dataArray.length; i++) {
      if (dataArray[i].indexOf('Loading') >= 0) {
        nanFound = true;
        Utilities.sleep(100); // pause for 100ms
        break;
      }
      else if (i == dataArray.length - 1) {
        nanFound = false;
      }
    }
  }
}


function populateBalanceCron() {
  populateBalance(0); // google puts dumb things into arguments, make sure they don't affect us
}

function populateBalance(cashflow) {
  refreshSheet();
  if (!cashflow) cashflow = 0;
  var ss = SpreadsheetApp.getActive();
  var balanceCell = ss.getRangeByName("currentBalance");
  var balance = balanceCell.getCell(1, 1).getValue();
  if (isNaN(balance)) {
    return;
  }
  var sharesCell = ss.getRangeByName("numShares");
  var shares = sharesCell.getCell(1, 1).getValue();

  var ledger = ss.getSheetByName("ledger");
  // loop until we find the first row with an empty date
  for (var insertRow = 1; ledger.getRange(insertRow, 1).getValue(); insertRow++) {
  }

  // insert today's date, cashflow & the balance on the empty row
  ledger.getRange(insertRow, 1).setValue(new Date());
  ledger.getRange(insertRow, 2).setValue(cashflow);
  ledger.getRange(insertRow, 4).setValue(balance);
  ledger.getRange(insertRow, 8).setValue(balance/shares);
}

var DATA_ROW_MIN = 2250; // we know the insert row is below this one
var NUM_COINS = 22;

function populateDataRow() {
  var ss = SpreadsheetApp.getActive();
  var exchanges = ss.getSheetByName("exchanges");
  var rateColumn = exchanges.getRange("C1:C" + NUM_COINS);

  var historical = ss.getSheetByName("historical");
  // loop until we find the first row with an empty date
  for (var insertRow = DATA_ROW_MIN; historical.getRange(insertRow, 1).getValue(); insertRow++) {
  }

  // insert the date and values of the coins against BTC
  var values = [new Date()];
  for (var ticker = 2; ticker <= NUM_COINS; ticker++) {
    var value = rateColumn.getCell(ticker, 1).getValue();
    values[ticker - 1] = value; // array is 0-indexed, cells are 1-indexed
  }

  historical.getRange(insertRow, /* start col= */ 1, /* num rows= */ 1, /* num cells= */ NUM_COINS).setValues([values]);
}
