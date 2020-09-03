function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Sheet actions')
    .addItem('Update', 'runUpdate')
    .addToUi();
}

const dateRegex = /(\d{4})(\d{2})(\d{2})/;

function parseDate(row) {
  const dateStr = row.date + '';
  const match = dateRegex.exec(dateStr); // [ "20200901", "2020", "09", "01" ]
  if (match == null) {
    return null;
  }
  const parsed = parseInt(match[2], 10) + '/' + parseInt(match[3], 10) + '/' + match[1]; // 9/1/2020
  row.dateParsed = parsed;
  return parsed;
}

function dateString(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return month + '/' + day + '/' + year; // 9/1/2020
}

function fetchData() {
  const url = "https://api.covidtracking.com/v1/states/co/daily.json";
  try {
    const res = UrlFetchApp.fetch(url);
    const text = res.getContentText();
    const json = JSON.parse(text);
    json.sort((a, z) => a['date'] - z['date']);
    return json.reduce((o, row) => {
      const key = parseDate(row);
      if (key != null) o[key] = row;
      return o;
    }, {});
  } catch (e) {
    return null;
  }
}

const COLUMNS = ['dateParsed', 'totalTestResultsIncrease', 'positive', 'negative',
  'hospitalizedCumulative', 'death', 'totalTestEncountersViral'];

function insertRow(data, sheet, rowIndex) {
  const range = sheet.getRange(rowIndex, /* start col */ 1, /* num rows */ 1, /* num cells */ COLUMNS.length);
  const values = COLUMNS.map(attr => data[attr])
  range.setValues([values]);
  copyFormulas(sheet, rowIndex, COLUMNS.length + 1);
}

function copyFormulas(sheet, rowIndex, startColumn) {
  const sourceRowStart = rowIndex - 1;
  const sourceColumnStart = startColumn;
  const numberOfSourceColumnsToGet = 6;

  const sourceRange = sheet.getRange(sourceRowStart, sourceColumnStart, 1, numberOfSourceColumnsToGet);
  const sourceFormulas = sourceRange.getFormulasR1C1();
  const targetRange = sheet.getRange(rowIndex, startColumn, 1, sourceFormulas[0].length);
  targetRange.setFormulasR1C1(sourceFormulas);
}

function runUpdate() {
  const data = fetchData();
  if (data == null) return;

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("data");
  // loop until we find the first row with an empty date (skip header row)
  let date = 'first'
  for (var rowIndex = 2; date; rowIndex++) {
    date = sheet.getRange(rowIndex, 1).getValue();
    const dateStr = typeof date === "string" ? date : dateString(date);
    delete data[dateStr];
  }
  rowIndex -= 1;

  Object.values(data).forEach(row => insertRow(row, sheet, rowIndex++));

  // sort sheet by date ascending
}
