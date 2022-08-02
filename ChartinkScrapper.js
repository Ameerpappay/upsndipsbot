const puppeteer = require("puppeteer");
let timeFrames = [
  { name: "daily", timeFrame: "d", range: "198" },
  { name: "weekly", timeFrame: "w", range: "504" },
];
let browser;
let page;

async function launchBrowser() {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
}

let downloadStockCharts = async (stockCode, path) => {
  try {
    await launchBrowser();
    let stockUrl = `https://chartink.com/stocks/${stockCode}.html`;
    await page.goto(stockUrl);
    const client = await page.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: `${__dirname}\\${path}`,
    });

    await setMovingAverages();

    for (var timeFrame of timeFrames) {
      await setTimeFrame(timeFrame);
      await page.click("#innerb");
      await page.waitForTimeout(3000);
      const iFrame = await page.frames().find((f) => f.name() === "ChartImage");
      await iFrame.waitForSelector("#saverbutton");
      const saveBtn = await iFrame.$("#saverbutton");
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch (err) {
  } finally {
    await browser.close();
  }
};

let setTimeFrame = async (inputTimeFrame) => {
  await page.$eval(
    "#d",
    (selectBox, timeFrame) => (selectBox.value = timeFrame),
    inputTimeFrame.timeFrame
  );
  await page.$eval(
    "#ti",
    (selectBox, range) => (selectBox.value = range),
    inputTimeFrame.range
  );
};

let setMovingAverages = async () => {
  const movingAverageRows = await page.$$("#moving_avgs tr:not(.limg)");
  for (var movingAverageRow = 0; movingAverageRow <= 2; movingAverageRow++) {
    await movingAverageRows[movingAverageRow].$eval(
      "td:first-child input",
      (checkbox) => (checkbox.checked = true)
    );
    await movingAverageRows[movingAverageRow].$eval(
      "td:nth-child(4) select",
      (selectBox) => (selectBox.value = "EMA")
    );

    let movingAverage =
      movingAverageRow == 0 ? 10 : movingAverageRow == 1 ? 20 : 50;

    await movingAverageRows[movingAverageRow].$eval(
      "td:nth-child(5) input",
      (textfield, movingAverage) => {
        textfield.value = movingAverage;
      },
      movingAverage
    );
  }
};

let scrapScreenerResult = async () => {
  let loopCount = 0;
  let stocks = [];
  let nextBtnExist = await isNextPaginationExist();
  do {
    if (loopCount != 0) {
      await clickNextPagination();
      nextBtnExist = await isNextPaginationExist();
    }

    var urlsScrapped = await page.$$eval(
      ".scan_results_table tr td:nth-child(2) a",
      (aTags) => aTags.map((aTag) => aTag.href)
    );
    stocks = stocks.concat(urlsScrapped);
    loopCount++;
  } while (nextBtnExist);
  return stocks;
};

let clickNextPagination = () => {
  return page.click(
    "#DataTables_Table_0_paginate ul li:last-child:not(.disabled)"
  );
};

let isNextPaginationExist = async () => {
  return (
    (
      await page.$$(
        "#DataTables_Table_0_paginate ul li:last-child:not(.disabled)"
      )
    ).length != 0
  );
};

module.exports = {
  downloadStockCharts,
};
