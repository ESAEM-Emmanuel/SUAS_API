const express = require("express");
const fileRoutes = express.Router();
const verifyToken = require('../middleware/verifyJWT');

const {uploadFile, toExcel, download, upload} = require("../controllers/fileController");

fileRoutes.post("/export-to-excel", toExcel);
fileRoutes.post("/upload", upload.array('files'),uploadFile);
fileRoutes.get("/download/:filename", download);

module.exports = fileRoutes;