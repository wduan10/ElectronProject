const { app, BrowserWindow } = require('electron');
const pie = require('puppeteer-in-electron');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const options = ['jackets', 'shirts', 'tops/sweaters', 'sweatshirts', 'pants', 'shorts', 't-shirts', 'hats', 'bags', 'accessories', 'shoes', 'skate'];
const option = options[6];
var data;

async function run(obj) {
    try {
        console.log(obj);
        // const browser = await puppeteer.launch({headless:false});
        // const page = await browser.newPage();
        const browser = await pie.connect(app, puppeteer);

        const window = new BrowserWindow({
            width: 700,
            height: 700,
            webPreferences: {
                nodeIntegration: true
            }
        });

        const page = await pie.getPage(browser, window);

        await page.goto('https://www.supremenewyork.com/shop/all/' + option);
        await page.waitForSelector('.name-link');

        data = await page.$$eval('.name-link', getInfo);
        refreshShop(page, obj);

        // await page.waitForSelector('#s');
        // dropDownMenu(page, '#s', desiredSize);
        await page.waitForSelector('#add-remove-buttons > input');
        await page.click('#add-remove-buttons > input');
        await page.waitFor(1000);
        await page.goto('https://www.supremenewyork.com/checkout');
        await page.waitForSelector('#order_billing_name');

        checkoutInfo(page, obj);

        await page.waitFor(obj.checkoutDelay);

        saveData(data);
        await browser.close();
    } catch(e) {
        console.log('error: ', e);
    }
}

async function dropDownMenu(page, id, target) {
    var sizeOptions = await page.$eval(id, (element) => {
        var options = element.children;
        var output = [];
        for (var i=0; i<options.length; i++) {
            output.push([options[i].value, options[i].innerText]);
        }
        return output;
    });
    for (var i=0; i<sizeOptions.length; i++) {
        if (sizeOptions[i][1] == target) {
            await page.select(id, sizeOptions[i][0]);
            break;
        }
    }
}

async function refreshShop(page, obj) {
    var url;
    var found = false;
    var allData;
    while (!found) {
        allData = await page.$$eval('.name-link', getInfo);
        for (var i=0; i<allData.length; i++) {
            var words = allData[i].name.split(' ');
            var counter = 0;
            for (var j=0; j<words.length; j++) {
                for (var k=0; k<obj.keyWords.length; k++) {
                    if (words[j].toLowerCase() == obj.keyWords[k].toLowerCase()) counter++;
                }
            }
            if (counter == obj.keyWords.length) {
                url = allData[i].url;
                found = true;
                break;
            }
        }
        if (!found) {
            await page.reload();
            await page.waitFor(obj.refreshDelay);
        }
    }
    await page.goto(url);
}

async function checkoutInfo(page, obj) {
    await page.click('#order_billing_name');
    await page.type('#order_billing_name', obj.name);
    await page.click('#order_email');
    await page.type('#order_email', obj.email);
    await page.click('#order_tel');
    await page.type('#order_tel', obj.tel);
    await page.click('#bo');
    await page.type('#bo', obj.address);
    await page.click('#order_billing_zip');
    await page.type('#order_billing_zip', obj.zip);
    await page.click('#rnsnckrn');
    await page.type('#rnsnckrn', obj.creditCard);
    await page.click('#orcer');
    await page.type('#orcer', obj.cvv);

    dropDownMenu(page, '#credit_card_month', obj.month);
    dropDownMenu(page, '#credit_card_year', obj.year);
    await page.click('#order_terms');
    await page.waitFor(obj.checkoutDelay);
    await page.click('#pay > input');
}

async function getInfo(divs) {
    var output = [];
    for (var i=0; i<divs.length; i+=2) {
        var name = divs[i].innerText;
        name = name.replace('\n', ' ');
        var color = divs[i+1].innerText;
        section = {
            name: name,
            color: color,
            url: divs[i].href
        }
        output = output.concat(section);
    }
    return output;
}

function saveData(input) {
    var header = Object.keys(input[0]).join('\t');
    var body = input.map(row=>Object.keys(row).map(key=> row[key]).join('\t')).join('\n');
    var tsvData = header + '\n' + body;
    fs.writeFileSync('botResults.tsv', tsvData, 'utf8');
}

module.exports = {
    run
};