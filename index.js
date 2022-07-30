const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// scrape extra details from company page on cb insights website
// ex page: https://www.cbinsights.com/company/stripe
async function scrapeCompanyPage(cbUrl) {
  try {
    const pageResponse = await axios({
      method: "get",
      url: cbUrl,
      headers: { Accept: "*/*" },
    });

    const $ = cheerio.load(pageResponse.data);
    //*[@id="__next"]/main/div[1]/div/header/div[2]/a
    return {
      name: $("main > div:nth-child(1) > div:nth-child(1) > header > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > h1").text(),
      website: $("main > div:nth-child(1) > div:nth-child(1) > header > div:nth-child(2) > a").attr("href"),
      // description: $(
      //   "#dashboard > div:nth-child(1) > div.span6 > p.hide-phone > span"
      // )
      //   .text()
      //   .replace(/(^\s+|\s+$)/g, ""),
      // funding: $(
      //   "#dashboard > div.row.mt20 > div:nth-child(2) > div > table > tbody > tr:nth-child(1) > td:nth-child(2) > span"
      // )
      //   .text()
      //   .replace(/^\s+|\s+$/g, ""),
    };
  } catch (error) {
    console.log(error.message);
    return {}
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// JSON to CSV Converter
function convertToCsv(objArray) {
  var array = typeof objArray != "object" ? JSON.parse(objArray) : objArray;
  var str = "";

  for (var i = 0; i < array.length; i++) {
    var line = "";
    for (var index in array[i]) {
      if (line != "") line += ";";

      line += array[i][index];
    }

    str += line + "\r\n";
  }

  return str;
}

function getHeaders() {
  return {
    date: "Updated at",
    name: "Company",
    cbUrl: "Crunchbase Url",
    valuation: "Last Valuation (Billion $)",
    dateJoined: "Date Joined",
    yearJoined: "Year Joined",
    city: "City",
    country: "Country",
    industry: "Industry",
    investor: "Investors",
    website: "Company Website"
  }
}

async function scrapeAndSaveData() {
  const baseUrl = "https://www.cbinsights.com/research-unicorn-companies";
  console.log("Scraping %s", baseUrl)
  try {
    const baseResponse = await axios({
      method: "get",
      url: baseUrl,
      headers: { Accept: "*/*" },
    });
    const $ = cheerio.load(baseResponse.data);

    const unicornDivs = $("table > tbody > tr");
    console.log("Found %d unicorns", unicornDivs.length);
    const data = [];
    for (let i = 0; i < unicornDivs.length; i++) {
      const div = $(unicornDivs[i]);
      const companyData = {
        date: new Date().toLocaleString("en-US"),
        name: div.find("td:nth-child(1) > a").text(),
        cbUrl: div.find("td:nth-child(1) > a").attr("href"),
        valuation: parseFloat(
          div.find("td:nth-child(2)").text().replace("$", "")
        ),
        dateJoined: div.find("td:nth-child(3)").text(),
        yearJoined: div.find("td:nth-child(3)").text().split("/")[2],
        city: div.find("td:nth-child(5)").text(),
        country: div.find("td:nth-child(4)").text(),
        industry: div.find("td:nth-child(6)").text(),
        investor: div.find("td:nth-child(7)").text().split(", "),
      };
      console.log("Fetching data for %s", companyData.name);
      const extraDetails = await scrapeCompanyPage(companyData.cbUrl);
      companyData.website = "website" in extraDetails ? extraDetails.website : "";
      // companyData.funding = "funding" in extraDetails ? extraDetails.funding : "";
      // companyData.description = "description" in extraDetails ? extraDetails.description : "";

      data.push(companyData);

      // adding 100 ms sleep to avoid getting blocked
      // await sleep(100);
    }

    console.log("updating data in unicorns.json");
    fs.writeFile("unicorns.json", JSON.stringify(data), function (err) {
      if (err) {
        console.log(err);
      }
    });

    // Convert JSON to CSV & Display CSV
    // data.unshift(getHeaders())
    // csv = convertToCsv(data);
    // fs.writeFile("unicorns.csv", csv, function (err) {
    //   if (err) {
    //     console.log(err);
    //   }
    // });

    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

scrapeAndSaveData();
