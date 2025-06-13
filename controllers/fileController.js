const jwt = require('jsonwebtoken');
const multer = require('multer');
const excel = require('exceljs');
const path = require('path');
const fs = require('fs');
const ResponseHandler = require('../utils/responseHandler');
require("dotenv").config(); 

// Création automatique du dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Dossier uploads créé avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de la création du dossier uploads:', error);
    }
}



const multerOptions = {
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  }

multerOptions.destination = (req, file, cb) => {
    const uploadFile = path.join(__dirname,'..', 'uploads');
    let filePath = uploadFile
    if(fs.existsSync(filePath)){
        fs.mkdirSync(filePath, {recursive: true});
    }
    cb(null, filePath);
}

const storage = multer.diskStorage(
    multerOptions
);

exports.upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      cb(null, true);
    }
   })



// Fonction utilitaire pour construire l'URL
const buildFileUrl = (filename) => {
    if (process.env.USE_FULL_URL === 'true') {
        return `https://${process.env.ADDRESS}/api/files/download/${filename}`;
    }
    return `https://${process.env.ADDRESS}:${process.env.PORT}/api/files/download/${filename}`;
};

exports.uploadFile = (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return ResponseHandler.error(res, 'Aucun fichier n\'a été téléchargé', 'BAD_REQUEST');
        }
  
        const uploadedFiles = req.files.map((file) => {
            const currentDateTime = new Date().toISOString().replace(/:/g, '-');
            const fileExtension = path.extname(file.filename);
            const newFilename = `${path.basename(file.filename, fileExtension)}_${currentDateTime}${fileExtension}`;
            const filePath = path.join(__dirname, '..', 'uploads', newFilename);
            
            fs.renameSync(file.path, filePath);
  
            return {
                filename: newFilename,
                filePath,
                url: buildFileUrl(newFilename),
            };
        });
  
        return ResponseHandler.success(res, uploadedFiles);
    } catch (error) {
        console.error('Erreur lors du téléchargement des fichiers:', error);
        return ResponseHandler.error(res, 'Erreur lors du téléchargement des fichiers');
    }
};

  
  exports.toExcel=async(req, res)=>{
  const { data, headings } = req.body;

  if (!Array.isArray(data)) { 
    return ResponseHandler.error(res, 'Format de données invalide. Un tableau d\'objets est attendu.', 'BAD_REQUEST'); 
    } 
    // Create a new Excel workbook and worksheet 
    const workbook = new excel.Workbook(); 
    const worksheet = workbook.addWorksheet('Sheet 1'); 
    
    worksheet.addRow(headings);
    data.forEach(obj => worksheet.addRow(Object.values(obj)));
    
    // Define the file path 
    const filePath = path.join(__dirname, '..', 'uploads', `exported_${Date.now()}.xlsx`); 
    
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        console.log('Le fichier existe déjà.');
    } catch {
        await fs.promises.writeFile(filePath, '');
        console.log('Fichier Excel créé avec succès!');
        await workbook.xlsx.writeFile(filePath); 
    }
    
    return ResponseHandler.success(res, { 
        fileUrl: buildFileUrl(path.basename(filePath))
    });
}

exports.download = async (req, res) => {
  const filename = req.params.filename;   
  const filePath = path.join(__dirname, '..', 'uploads', filename);

  if (fs.existsSync(filePath)) {
      res.download(filePath, err => {
          if (err) {
              console.error('Erreur lors du téléchargement du fichier:', err);
              return ResponseHandler.error(res, 'Erreur lors du téléchargement du fichier');
          }
      });
  } else {
      return ResponseHandler.error(res, 'Fichier non trouvé', 'NOT_FOUND');
  }
};
