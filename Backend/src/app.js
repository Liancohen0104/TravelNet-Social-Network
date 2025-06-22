// Express מגדיר את אפליקציית ה

const express = require('express');
const cors = require('cors');
require('dotenv').config();   

const app = express();

app.use(cors());              // מתיר קריאות מהפרונט
app.use(express.json());      // json מאשר מבנה של 

require('./routes')(app);     

// טיפול ב404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

module.exports = app;
