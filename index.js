const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// scrape extra details from company page on cb insights website
// ex page: https://www.cbinsights.com/company/stripe
async function scrapeCompanyPage(cbUrl) {
  const pageResponse = await axios({
    method: "get",
    url: cbUrl,
    headers: { Accept: "*/*" },
  });

  const $ = cheerio.load(pageResponse.data);

  try {
    return {
      name: $("#company_header > div.span9 > h1 > span").text(),
      website: $("#company_header > div.span9 > h1 > small > a").attr("href"),
      description: $(
        "#dashboard > div:nth-child(1) > div.span6 > p.hide-phone > span"
      )
        .text()
        .replace(/(^\s+|\s+$)/g, ""),
      funding: $(
        "#dashboard > div.row.mt20 > div:nth-child(2) > div > table > tbody > tr:nth-child(1) > td:nth-child(2) > span"
      )
        .text()
        .replace(/^\s+|\s+$/g, ""),
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeAndSaveData() {
  const baseUrl = "https://www.cbinsights.com/research-unicorn-companies";

  try {
    const baseResponse = await axios({
      method: "get",
      url: baseUrl,
      headers: { Accept: "*/*" },
    });
    const $ = cheerio.load(baseResponse.data);

    const unicornDivs = $("#element-32 > div > table > tbody > tr");

    const data = [];

    // for (let i = 0; i < unicornDivs.length; i++) {
    for (let i = 0; i < 5; i++) {
      const div = $(unicornDivs[i]);
      const companyData = {
        name: div.find("td:nth-child(1) > a").text(),
        cbUrl: div.find("td:nth-child(1) > a").attr("href"),
        valuation: parseFloat(
          div.find("td:nth-child(2)").text().replace("$", "")
        ),
        dateJoined: div.find("td:nth-child(3)").text(),
        yearJoined: div.find("td:nth-child(3)").text().split("/")[2],
        country: div.find("td:nth-child(4)").text(),
        city: div.find("td:nth-child(5)").text(),
        industry: div.find("td:nth-child(6)").text(),
        investor: div.find("td:nth-child(7)").text().split(", "),
      };

      // fetching extra details from individual company pages on CB Insights
      const extraDetails = await scrapeCompanyPage(companyData.cbUrl);
      companyData.website = extraDetails.website;
      companyData.funding = extraDetails.funding;
      companyData.description = extraDetails.description;
      data.push(companyData);

      // adding 100 ms sleep to avoid getting blocked
      await sleep(100);
    }

    console.log("updating data in unicorns.json");
    fs.writeFile("unicorns.json", JSON.stringify(data), function (err) {
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
