const express = require("express");
const fileRoutes = express.Router();
const verifyToken = require('../middleware/verifyJWT');

const { uploadFile, toExcel, download, upload } = require("../controllers/fileController");

fileRoutes.post("/export-to-excel", toExcel);
fileRoutes.post("/upload", upload.array('files', 10), uploadFile); // 'files' est le nom du champ attendu
fileRoutes.get("/download/:filename", download);

module.exports = fileRoutes;