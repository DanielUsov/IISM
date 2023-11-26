import axios from 'axios';
import cheerio from 'cheerio';
import amqp from 'amqplib';
import csv from 'csv-parser';
import { createReadStream, readFileSync } from 'fs';

async function fetchPage(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Ошибка при загрузке страницы ${url}:`, error.message);
    const html = readFileSync('./index.html', { encoding: 'utf-8' });
    return html;
  }
}

async function getNameFromPage(html) {
  try {
    if (!html) {
      html = readFileSync('./index.html', { encoding: 'utf-8' });
    }

    const $ = cheerio.load(html.toString());
    const pageTitle = $('.page-title__title').text();
    return pageTitle;
  } catch (error) {
    console.error(`Ошибка при парсинге страницы `, error.message);
    return null;
  }
}

async function rabbitMQConnect(users) {
  let connection;
  try {
    connection = await amqp.connect('amqp://guest:guest@localhost:5672/');
    const channel = await connection.createChannel();
    await channel.assertQueue('users_from_habr', { durable: true });
    users.forEach((user) => {
      channel.sendToQueue(
        'users_from_habr',
        Buffer.from(
          JSON.stringify({ url: user.url, name: user.name, html: user.html })
        )
      );
    });
    await channel.close();
  } catch (err) {
    console.warn(err);
  } finally {
    if (connection) await connection.close();
  }
}

async function collector(urlArray) {
  let promises = [];
  for (let index = 0; index < urlArray.length; index++) {
    promises.push(
      new Promise(async (resolve) => {
        let currentUser = {};
        currentUser.url = urlArray[index];
        currentUser.html = await fetchPage(urlArray[index]);
        currentUser.name = await getNameFromPage(currentUser.html);
        resolve(currentUser);
      })
    );
  }

  let result = await Promise.all(promises);
  await rabbitMQConnect(result);
}

function start() {
  let urlArray = [];
  createReadStream('habr.csv')
    .pipe(csv())
    .on('data', async (row) => {
      urlArray.push(row.url);
    })
    .on('end', async () => {
      console.log('Чтение CSV файла завершено');
      urlArray.splice(2);
      await collector(urlArray);
    })
    .on('error', async () => {
      console.log('Чтение CSV файла не завершено');
    });
}

start();
