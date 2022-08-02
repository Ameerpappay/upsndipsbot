const path = require("path");
const fs = require("fs");
const Moment = require("moment");
const puppeteer = require("puppeteer");
const { Telegraf } = require("telegraf");
const bot = new Telegraf("5262066864:AAGCIaMKQ0B3caXsiQ4uNzfNFCLeuXCHbRI");
const sheetName = "upsNdipsmomentum!A2:H";
const { getAuthToken, getSpreadSheetValues } = require("./googleSheet");
const { downloadStockCharts } = require("./ChartinkScrapper");

(async () => {
  bot.command("start", (ctx) => {
    console.log(ctx.from);
    bot.telegram.sendMessage(
      ctx.chat.id,
      "hello there! Welcome to ups n dips",
      upsnsipdsOptions
    );
  });

  const telegramButtons = Object.freeze({
    latestFastMovers: "Latest Fast Movers",
    latestMediumMovers: "Latest Medium Movers",
    latestSlowMovers: "Latest Slow Movers",
    fullFastMovers: "Full Fast Movers",
    fullMediumMovers: "Full Medium Movers",
    fullSlowMovers: "Full Slow Movers",
  });

  const upsnsipdsOptions = {
    reply_markup: {
      one_time_keyboard: true,
      keyboard: [
        [
          {
            text: telegramButtons.latestFastMovers,
            one_time_keyboard: true,
          },
        ],
        [
          {
            text: telegramButtons.latestMediumMovers,
            one_time_keyboard: true,
          },
        ],
        [
          {
            text: telegramButtons.latestSlowMovers,
            one_time_keyboard: true,
          },
        ],
        [
          {
            text: telegramButtons.fullFastMovers,
            one_time_keyboard: true,
          },
        ],
        [
          {
            text: telegramButtons.fullMediumMovers,
            one_time_keyboard: true,
          },
        ],
        [
          {
            text: telegramButtons.fullSlowMovers,
            one_time_keyboard: true,
          },
        ],
        ["Cancel"],
      ],
    },
  };

  bot.hears(telegramButtons.latestFastMovers, async (ctx) => {
    setSheetMainData(async (sheetData) => {
      let latestDate = sheetData.data[0]?.stockAddedDate;
      await sendBotResponse(
        sheetData,
        (x) => {
          return (
            (x.percentangeTo52WH == null ||
              x.percentangeTo52WH == "" ||
              parseFloat(x.percentangeTo52WH) <= 5) &&
            x.stockAddedDate == latestDate
          );
        },
        ctx
      );
    });
  });

  bot.hears(telegramButtons.latestMediumMovers, async (ctx) => {
    ctx.reply(`scrapping ${telegramButtons.latestMediumMovers}.....`);
    await setSheetMainData(async (sheetData) => {
      let latestDate = sheetData.data[0]?.stockAddedDate;
      await sendBotResponse(
        sheetData,
        (x) =>
          parseFloat(x.percentangeTo52WH) > 5 &&
          parseFloat(x.percentangeTo52WH) <= 10 &&
          x.stockAddedDate == latestDate,
        ctx
      );
    });
  });

  bot.hears(telegramButtons.latestSlowMovers, async (ctx) => {
    ctx.reply(`scrapping ${telegramButtons.latestSlowMovers}.....`);
    await setSheetMainData(async (sheetData) => {
      let latestDate = sheetData.data[0]?.stockAddedDate;
      await sendBotResponse(
        sheetData,
        (x) =>
          parseFloat(x.percentangeTo52WH) > 10 &&
          x.stockAddedDate == latestDate,
        ctx
      );
    });
  });

  bot.hears(telegramButtons.fullFastMovers, async (ctx) => {
    ctx.reply(`scrapping ${telegramButtons.fullFastMovers}.....`);
    await setSheetMainData(async (sheetData) => {
      await sendBotResponse(
        sheetData,
        (x) => {
          return (
            x.percentangeTo52WH == null ||
            x.percentangeTo52WH == "" ||
            parseFloat(x.percentangeTo52WH) <= 5
          );
        },
        ctx
      );
    });
  });

  bot.hears(telegramButtons.fullMediumMovers, async (ctx) => {
    ctx.reply(`scrapping ${telegramButtons.fullMediumMovers}.....`);
    await setSheetMainData(async (sheetData) => {
      await sendBotResponse(
        sheetData,
        (x) =>
          parseFloat(x.percentangeTo52WH) > 5 &&
          parseFloat(x.percentangeTo52WH) <= 10,
        ctx
      );
    });
  });

  bot.hears(telegramButtons.fullSlowMovers, async (ctx) => {
    ctx.reply(`scrapping ${telegramButtons.fullSlowMovers}.....`);
    await setSheetMainData(async (sheetData) => {
      await sendBotResponse(
        sheetData,
        (x) => parseFloat(x.percentangeTo52WH) > 10,
        ctx
      );
    });
  });

  bot.launch();
})();

async function sendBotResponse(sheetData, filter, ctx) {
  if (sheetData.message != "success") {
    ctx.reply(sheetData.message);
  } else {
    let filteredData = sheetData.data.filter(filter);
    ctx.reply(`Total ${filteredData.length} exist`);
    ctx.reply(`Loading charts....`);
    await new Promise((res) => setTimeout(res, 500));
    for (let stock of filteredData) {
      let folderPath = await createFolder(`${ctx.chat.id}\\${stock.stockCode}`);
      await downloadStockCharts(stock.stockCode, folderPath);
      ctx.reply(` 
                  stock : ${stock.stockName}
                  current Price : ${stock.currentPrice}
                  Latest Change : ${stock.todayChange} %
                  Percentage to 52WH : ${stock.percentangeTo52WH} %
                  Added date : ${new Date(
                    stock.stockAddedDate
                  ).toLocaleDateString("in")}
                  https://www.screener.in/${stock.stockScreenerUrl}`);
      await new Promise((res) => setTimeout(res, 500));
      var images = await readImageDirectory(folderPath);
      if (images.length > 0) {
        for (var image of images) {
          let imageSource = `${__dirname}\\${folderPath}\\${image}`;
          ctx.replyWithPhoto({ source: imageSource });
          await new Promise((res) => setTimeout(res, 500));
          removeFileFromDirectory(imageSource);
        }
      }
    }
  }
}

function createFolder(path) {
  return new Promise((resolve, reject) => {
    var fs = require("fs");
    var dir = `imagesFolder\\${path}`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    resolve(dir);
  });
}

function removeFileFromDirectory(fileName) {
  console.log("removed " + fileName);
  fs.unlink(fileName, (err) => {
    console.log(err);
  });
}

function readImageDirectory(filePath) {
  return new Promise((resolve, reject) => {
    const directoryPath = path.join(__dirname, filePath);
    //passsing directoryPath and callback function
    fs.readdir(directoryPath, function (err, files) {
      //handling error
      if (err) {
        resolve([]);
      }
      resolve(files);
    });
  });
}

async function setSheetMainData(callback) {
  try {
    const googleSheetAuth = await getAuthToken();
    var spreadSheetValues = await getSpreadSheetValues({
      spreadsheetId: "1KwKecChnD3-iu7BHUN5_GAUoQ6VuubBHpqRbfW4-MV4",
      auth: googleSheetAuth,
      sheetName: sheetName,
    });

    let sheetData = spreadSheetValues
      .map((x) => {
        return {
          stockName: x[0],
          stockCode: x[1],
          stockScreenerUrl: x[2],
          stockAddedDate: x[3],
          todayChange: x[5] ? x[5] : null,
          currentPrice: x[6] ? x[6] : null,
          percentangeTo52WH: x[7] ? x[7] : null,
        };
      })
      .sort(
        (a, b) =>
          new Moment(b.stockAddedDate).format("YYYYMMDD") -
          new Moment(a.stockAddedDate).format("YYYYMMDD")
      );
    callback({ message: "success", data: sheetData });
  } catch (ex) {
    callback({ message: "Error reading data from sheet" });
  }
}
