const jwt = require('jsonwebtoken');
const multer = require('multer');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
require("dotenv").config(); 

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadFile = path.join(__dirname,'..', 'uploads');
        if(fs.existsSync(uploadFile)){
            fs.mkdirSync(uploadFile, {recursive: true});
        }
        cb(null, uploadFile);
      },
      filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
      }    
});
// exports.upload = multer({ dest: 'uploads/' });
exports.upload = multer({ storage });

exports.uploadFile = (req, res) => {
    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ message: 'No files uploaded.' });
      }
  
      const uploadedFiles = req.files.map((file) => {
        const filePath = path.join(__dirname, '..', 'uploads', file.filename);
        console.log(file)
        return {
          filename: file.filename,
          filePath,
          url: `http://${process.env.ADDRESS}:${process.env.PORT}/file/download/${path.basename(filePath)}`,
        };
      });
  
      return res.send(uploadedFiles );
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ message: 'Error uploading files.' });
    }
};
  
  exports.toExcel=async(req, res)=>{
  const { data, headings } = req.body;

  if (!Array.isArray(data)) { 
    return res.status(400).send('Invalid data format. Expected an array of objects.'); 
    } 
    // Create a new Excel workbook and worksheet 
    const workbook = new excel.Workbook(); 
    const worksheet = workbook.addWorksheet('Sheet 1'); 
    
    worksheet.addRow(headings);
    data.forEach(obj => worksheet.addRow(Object.values(obj)));
    
    // Define the file path 
    const filePath = path.join(__dirname, '..', 'uploads', `exported_${Date.now()}.xlsx`); 
    fs.promises.access(filePath, fs.constants.F_OK)
    .then(() => {
        console.log('File already exists.');
    })
    .catch(() => {
        // Create the file if it doesn't exist
        fs.writeFile(filePath, '', (err) => {
        if (err) {
            console.error('Error creating file:', err);
            return;
        }
        console.log('Excel file created successfully!');
        workbook.xlsx.writeFile(filePath); 
        });
    });
    
    
    
    res.json({ fileUrl: `http://${process.env.ADDRESS}:${process.env.PORT}/file/download/${path.basename(filePath)}` });
}

exports.download=async (req, res)=>{
    const filename = req.params.filename;   
    console.log(filename);
    const filePath = path.join('C:\\Users\\belombo\\Documents\\DPWS project\\ENTITY_USER_API\\', 'uploads', filename);
    console.log(filePath);

    if (fs.existsSync(filePath)) {
        res.download(filePath, err => {
            if (err) {
                console.error('File download error:', err);
                res.status(500).send('File download error.');
            }
        });
    } else {
        res.status(404).send('File not found.');
    }
}
