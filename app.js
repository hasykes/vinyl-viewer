import 'dotenv/config';
import express from 'express';
import pkg from 'disconnect';
const { Client: Discogs } = pkg;
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express()
const port = 3000

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const dis = new Discogs({userToken: process.env.DISCOGS_PAT});

var cachedCollection = [];

const readCollectionFromFile =  async () => {
  const data = await readFile('./public/dataStore.js', 'utf8');
  const dataString = data.replace('const cachedCollection = ', '');
  return JSON.parse(dataString);
      
}

cachedCollection = await readCollectionFromFile();
console.log(`${cachedCollection.length} items loaded from dataStore.js`);

const saveCollectionToFile = () => {
  writeFile('./public/dataStore.js', `const cachedCollection =  ${JSON.stringify(cachedCollection, null, 2)}`, (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('Collection saved to dataStore.js');
    }
  });  
}; 

const collection = [];
const requestFullCollectionWithPagination = async () => {
  //Get user public collection (no auth requried)
  var col = new Discogs().user().collection();
  let page = 1;
  let totalPages = 1;
  const firstCollectionRequest = await col.getReleases(process.env.DISCOGS_USER, 0, {sort:'artist',sort_order:'asc', page, per_page: 100})
  .then(function(data) {
      return data;
    })
  .catch(function(err) {
      console.error(err);
  });
  collection.push(...firstCollectionRequest.releases);
  totalPages = firstCollectionRequest.pagination.pages;

  for (page = 2; page <= totalPages; page++) {
      let pageCollectionRequest = await col.getReleases(process.env.DISCOGS_USER, 0, {sort:'artist',sort_order:'asc', page, per_page: 100})
      .then(function(data) {
          return data;
        })
      .catch(function(err) {
          console.error(err);
      });
      collection.push(...pageCollectionRequest.releases);    
  }


}

app.get('/refresh-collection', (req, res) => {
  requestFullCollectionWithPagination().then(() => {
    cachedCollection = collection;
    saveCollectionToFile();
    res.send(`Collection refreshed. ${cachedCollection.length} items loaded.`);
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'public', 'index.html'));
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
