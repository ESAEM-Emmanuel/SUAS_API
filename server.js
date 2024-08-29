require("dotenv").config();
const express = require('express');
const app = express();
const fs = require('fs');
const https = require('https');
const path = require('path');
const userRoutes = require('./routes/userRoutes');
// Import other routes...

app.use(express.json());
app.use('/users', userRoutes);
// Use other routes...

const options = {
    key: fs.readFileSync(path.join(__dirname, 'cert', 'cert.key')),
    cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.crt'))
};
const PORT = process.env.PORT || 8080;
const ADDRESS = process.env.ADDRESS || "192.168.1.125";
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
https.createServer(options, app).listen(PORT, ADDRESS, () => {
    console.log(`HTTPS Server running on https://${ADDRESS}:${PORT}`);
});