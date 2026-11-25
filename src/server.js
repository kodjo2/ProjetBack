require('dotenv').config();

const cors = require('cors');
const express = require('express');
const { testConnection } = require('./config/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    await testConnection();
  } catch {
    console.error('Démarrage annulé : connexion à MySQL impossible.');
    process.exitCode = 1;
    return;
  }

  app.listen(port, () => {
    console.log(`Library Manager API listening on port ${port}`);
  });
}

startServer();
