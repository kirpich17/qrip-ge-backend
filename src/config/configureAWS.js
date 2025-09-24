const  AWS=require('aws-sdk');
const dotenv =require('dotenv');

dotenv.config(); // Ensure environment variables are loaded

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_S3_ACCESS_KEY,
  secretAccessKey: process.env.AWS_S3_SECRET_KEY,
  endpoint: "qrip.hel1.your-objectstorage.com",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
  region: "eu-central-1"
});


 const uploadFileToS3 = async (file, subfolder = 'uploads') => {
  try {
    if (!file || !file.buffer || !file.originalname || !file.mimetype) {
      throw new Error("Invalid file object provided for S3 upload.");
    }
    const uniqueKey = `${subfolder}/${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    console.log(`Attempting S3 upload to Bucket: ${params.Bucket}, Key: ${params.Key}, ContentType: ${params.ContentType}`);
    const s3Response = await s3.upload(params).promise();
    console.log('S3 Upload successful:', s3Response.Location);
    return s3Response.Location; // This is the public URL of the uploaded file

  } catch (error) {
    console.error('S3 upload error details:');
    console.error('Error code:', error.code);
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('Bucket:', process.env.AWS_S3_BUCKET_NAME);
    console.error('Region:', AWS.config.region);
    throw new Error(`Failed to upload file "${file ? file.originalname : 'unknown'}" to cloud storage.`);
  }
};


const deleteFileFromS3 = async (key) => {
  if (!key) {
    console.warn('Attempted to delete from S3 with an empty key.');
    return;
  }

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted ${key} from S3.`);
  } catch (error) {
    console.error(`Error deleting ${key} from S3:`, error);
    // You might choose to re-throw or handle based on criticality.
    // For now, we'll just log and continue, as a failed delete shouldn't
    // necessarily block the main operation (e.g., banner deletion).
  }
};

module.exports= {uploadFileToS3,deleteFileFromS3}

