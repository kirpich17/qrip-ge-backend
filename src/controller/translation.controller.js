const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../uploads/languages');
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const language = req.body.language || 'en';
    cb(null, `${language}.json`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  }
});

// Get all translation files info
const getTranslationFiles = async (req, res) => {
  try {
    const languages = ['en', 'ka', 'ru'];
    const uploadPath = path.join(__dirname, '../../uploads/languages');
    
    const files = languages.map(language => {
      const filePath = path.join(uploadPath, `${language}.json`);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        const stats = fs.statSync(filePath);
        return {
          language,
          filename: `${language}.json`,
          size: stats.size,
          lastModified: stats.mtime.toISOString(),
          exists: true
        };
      } else {
        return {
          language,
          filename: `${language}.json`,
          size: 0,
          lastModified: null,
          exists: false
        };
      }
    });

    res.json(files);
  } catch (error) {
    console.error('Error fetching translation files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch translation files',
      error: error.message 
    });
  }
};

// Upload translation file
const uploadTranslationFile = async (req, res) => {
  try {
    // Use multer middleware
    upload.single('file')(req, res, function (err) {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { language } = req.body;
      
      // Validate JSON file
      try {
        const filePath = req.file.path;
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Validate that it's a proper JSON object
        if (typeof jsonData !== 'object' || jsonData === null) {
          throw new Error('Invalid JSON structure');
        }
        
        // Also update the frontend locales
        const frontendPath = path.join(__dirname, '../../../qrip-ge/locales', `${language}.json`);
        fs.writeFileSync(frontendPath, JSON.stringify(jsonData, null, 2));
        
        res.json({
          success: true,
          message: `${language} translation file uploaded successfully`,
          data: {
            language,
            filename: req.file.filename,
            size: req.file.size,
            path: req.file.path
          }
        });
        
      } catch (jsonError) {
        // Delete the uploaded file if JSON is invalid
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON file. Please ensure the file contains valid JSON.',
          error: jsonError.message
        });
      }
    });
  } catch (error) {
    console.error('Error uploading translation file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload translation file',
      error: error.message
    });
  }
};

// Download translation file
const downloadTranslationFile = async (req, res) => {
  try {
    const { language } = req.params;
    const filePath = path.join(__dirname, '../../uploads/languages', `${language}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Translation file for ${language} not found`
      });
    }
    
    res.download(filePath, `${language}.json`, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          message: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    console.error('Error downloading translation file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download translation file',
      error: error.message
    });
  }
};

// Preview translation file
const previewTranslationFile = async (req, res) => {
  try {
    const { language } = req.params;
    const filePath = path.join(__dirname, '../../uploads/languages', `${language}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Translation file for ${language} not found`
      });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    res.json({
      success: true,
      data: jsonData,
      language,
      filename: `${language}.json`
    });
  } catch (error) {
    console.error('Error previewing translation file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview translation file',
      error: error.message
    });
  }
};

module.exports = {
  getTranslationFiles,
  uploadTranslationFile,
  downloadTranslationFile,
  previewTranslationFile
};
