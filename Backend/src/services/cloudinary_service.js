// Cloudinary שירות העלאת קבצים מהצ'אט ל

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let resourceType = "image";
    if (file.mimetype.startsWith("video/")) {
      resourceType = "video";
    }

    return {
      folder: "chat_attachments",
      resource_type: resourceType,
      allowed_formats: ["jpg", "png", "jpeg", "gif", "pdf", "mp4"]
    };
  },
});

const upload = multer({ storage });

module.exports = { cloudinary, upload };