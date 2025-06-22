// MongoDB ומתחבר ל Express מפעיל את ה

const mongoose = require('mongoose');
const app = require('./src/app');   
const http = require('http');
const { setupSocket } = require('./src/sockets/socket');

const PORT = process.env.PORT;          //פורט
const URI  = process.env.MONGO_URI;     // DB גישה ל

const server = http.createServer(app);  // http יוצרים שרת 
setupSocket(server);

mongoose
  .connect(URI)
  .then(() => {
    console.log('Mongo connected');
    server.listen(PORT, () => console.log(`API + Socket running at http://localhost:${PORT}`));
  })
  .catch((err) => console.error('Mongo error:', err));