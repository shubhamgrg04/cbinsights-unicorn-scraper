const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const {stringify} = require('csv-stringify/sync');

// scrape extra details from company page on cb insights website
// example page: https://www.cbinsights.com/company/stripe
async function scrapeCompanyPage(cbUrl) {
  try {
    const pageResponse = await axios({
      method: "get",
      url: cbUrl,
      headers: { Accept: "*/*" },
    });

    const $ = cheerio.load(pageResponse.data);
    return {
      name: $("main > div:nth-child(1) > div:nth-child(1) > header > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > h1").text(),
      website: $("main > div:nth-child(1) > div:nth-child(1) > header > div:nth-child(2) > a").attr("href"),
    };
  } catch (error) {
    console.log(error.message);
    return {}
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      data.push(companyData);
    }

    data.sort((a,b) => (a.yearJoined < b.yearJoined)?1:-1);

    console.log("updating data in unicorns.json");
    fs.writeFile("unicorns.json", JSON.stringify(data), function (err) {
      if (err) {
        console.log(err);
      }
    });

    console.log("updating data in unicorns.csv");
    data.unshift(getHeaders())
    csv = stringify(data);
    fs.writeFile("unicorns.csv", csv, function (err) {
      if (err) {
        console.log(err);
      }
    });

    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

scrapeAndSaveData();
