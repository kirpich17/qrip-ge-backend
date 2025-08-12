// controllers/memorial.controller.js

const { uploadFileToS3, deleteFileFromS3 } = require("../config/configureAWS");
const Memorial = require("../models/memorial.model");
const userModel = require("../models/user.model");
const UserSubscription = require("../models/UserSubscription");
const { createPaginationObject } = require("../utils/pagination");

exports.createMemorial = async (req, res) => {
  try {
    // Add the logged-in user's ID to the request body
    req.body.createdBy = req.user.userId;
    const memorialImageFile = req.file;

    let imageUrl = null;
    if (memorialImageFile) {
      try {
        // 'offers' is the subfolder in your S3 bucket
        imageUrl = await uploadFileToS3(memorialImageFile, "memorials");

        req.body.profileImage = imageUrl;
      } catch (s3UploadError) {
        console.error("Error uploading image to S3:", s3UploadError);
        return res
          .status(500)
          .json({ message: "Failed to upload offer image. Please try again." });
      }
    }
    const memorial = await Memorial.create(req.body);
    res.status(201).json({
      status: true,
      message: "Memorial created successfully",
      data: memorial,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.getMyMemorials = async (req, res) => {
  try {
    // --- Destructure query parameters with defaults ---
    const {
      search = "",
      page = 1,
      limit = 5,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // --- Build the Search Query ---
    const query = { createdBy: req.user.userId };
    if (search) {
      const searchRegex = new RegExp(search?.trim(), "i");
      query.$or = [{ firstName: searchRegex }, { lastName: searchRegex }];
    }

    // --- Prepare Sorting & Pagination values ---
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const limitValue = parseInt(limit);
    const skipValue = (parseInt(page) - 1) * limitValue;

    // --- Execute Queries ---
    const [memorials, totalItems] = await Promise.all([
      Memorial.find(query).sort(sortOptions).skip(skipValue).limit(limitValue),
      Memorial.countDocuments(query),
    ]);

    // ✅ Step 2: Use the reusable function to generate the pagination object
    const pagination = createPaginationObject(totalItems, page, limitValue);

    // --- Construct the Response ---
    res.json({
      status: true,
      data: memorials,
      // ✅ Step 3: Add the generated pagination object to the response
      pagination: pagination,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};



exports.getPublicMemorialBySlug = async (req, res) => {
  try {
    const memorial = await Memorial.findOneAndUpdate(
      { slug: req.params.slug, isPublic: true, status: "active" },
      { $inc: { views: 1 } }, // Increment the view count
      { new: true } // Return the updated document
    );

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found or is private." });
    }
    res.json({ status: true, data: memorial });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.getMemorialById = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      isPublic: true,
      status: "active",
    });

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check: ensure the logged-in user is the owner

    // if (memorial.createdBy.toString() !== req.user.userId) {
    //   return res.status(403).json({
    //     status: false,
    //     message: "Forbidden: You do not have permission to view this.",
    //   });
    // }

    res.json({ status: true, data: memorial });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.updateMemorial = async (req, res) => {
  try {
    let memorial = await Memorial.findById(req.params.id);
    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check
    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have permission to update this.",
      });
    }

    // Update the memorial
    memorial = await Memorial.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      status: true,
      message: "Memorial updated successfully",
      data: memorial,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.deleteMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id);
    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check
    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have permission to delete this.",
      });
    }

    await memorial.deleteOne();

    res.json({ status: true, message: "Memorial deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.addPhotosToMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id);

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check: ensure the logged-in user is the owner
    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have permission to update this.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No image files were uploaded." });
    }

    const imageUrls = [];
    // Loop through all uploaded files
    for (const file of req.files) {
      const imageUrl = await uploadFileToS3(file, "memorials/gallery");
      imageUrls.push(imageUrl);
    }

    // Add the new image URLs to the gallery using $push
    memorial.photoGallery.push(...imageUrls);
    await memorial.save();

    res.json({
      status: true,
      message: "Photos added successfully.",
      data: memorial,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.addVideoToMemorial = async (req, res) => {
  try {
    // The video file is now in req.file, and the title is in req.body
    const { title } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res
        .status(400)
        .json({ status: false, message: "Video file is required." });
    }

    const memorial = await Memorial.findById(req.params.id);

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check
    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have permission to update this.",
      });
    }

    // ENFORCE "ONLY ONE VIDEO" RULE
    if (memorial.videoGallery.length > 0) {
      return res.status(400).json({
        status: false,
        message: "You can only add one video to this memorial.",
      });
    }

    // --- S3 UPLOAD LOGIC ---
    let videoUrl = null;
    try {
      // Upload the file to a 'videos' subfolder in your S3 bucket for organization
      videoUrl = await uploadFileToS3(videoFile, "memorials/videos");
    } catch (s3UploadError) {
      console.error("Error uploading video to S3:", s3UploadError);
      return res
        .status(500)
        .json({ message: "Failed to upload video. Please try again." });
    }
    // --- END S3 UPLOAD LOGIC ---

    // Add the new video object (with the S3 URL) to the videoGallery array
    memorial.videoGallery.push({
      title: title || videoFile.originalname,
      url: videoUrl,
    });
    await memorial.save();

    res.json({
      status: true,
      message: "Video uploaded and added successfully.",
      data: memorial,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.updateFamilyTree = async (req, res) => {
  try {
    const { familyTree } = req.body; // Expecting an array of family member objects

    if (!Array.isArray(familyTree)) {
      return res
        .status(400)
        .json({ status: false, message: "Family tree data must be an array." });
    }

    const memorial = await Memorial.findById(req.params.id);
    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check
    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have permission to update this.",
      });
    }

    // Overwrite the existing family tree with the new one
    memorial.familyTree = familyTree;
    await memorial.save();

    res.json({
      status: true,
      message: "Family tree updated successfully.",
      data: memorial,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

exports.addDocumentsToMemorial = async (req, res) => {
  try {
    const memorial = await Memorial.findById(req.params.id);

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Authorization check: ensure the logged-in user is the owner
    if (memorial.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have permission to update this.",
      });
    }

    // Check if any files were actually uploaded
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No document files were uploaded." });
    }

    const documentsData = [];
    // Loop through all uploaded files and upload them to S3
    for (const file of req.files) {
      // Upload to a 'documents' subfolder for better organization
      const fileUrl = await uploadFileToS3(file, "memorials/documents");

      // Prepare the object to be stored in the database
      documentsData.push({
        fileName: file.originalname, // The original name of the file
        url: fileUrl, // The secure S3 URL
      });
    }

    // Add the new document objects to the 'documents' array in the memorial
    memorial.documents.push(...documentsData);
    await memorial.save();

    res.json({
      status: true,
      message: "Documents uploaded successfully.",
      data: memorial,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Server Error: " + error.message });
  }
};

// exports.createOrUpdateMemorial = async (req, res) => {
//   try {
//     const { _id } = req.body;
//     const files = req.files || [];

//     // Helper: Group files by fieldname
//     const groupedFiles = files.reduce((acc, file) => {
//       if (!acc[file.fieldname]) acc[file.fieldname] = [];
//       acc[file.fieldname].push(file);
//       return acc;
//     }, {});

//     // Upload all grouped files to S3 and add to req.body
//     const uploadGroupedFilesToS3 = async () => {
//       const fileFields = [
//         "photoGallery",
//         "profileImage",
//         "videoGallery",
//         "documents",
//       ];
//       for (const field of fileFields) {
//         if (groupedFiles[field]) {
//           if (field == "profileImage") {
//             const url = await uploadFileToS3(
//               groupedFiles[field][0],
//               "memorials/" + field
//             );
//             req.body[field] = url;
//           } else {
//             const uploadedUrls = [];

//             for (const file of groupedFiles[field]) {
//               if (file) {
//                 const url = await uploadFileToS3(file, "memorials/" + field);
//                 if (url) {
//                   uploadedUrls.push(url);
//                 }
//               }
//             }
//             console.log(uploadedUrls);

//             req.body[field] = uploadedUrls;
//           }
//         }
//       }
//     };

//     if (_id) {
//       // ====== Update Existing ======
//       let memorial = await Memorial.findById(_id);
//       if (!memorial) {
//         return res
//           .status(404)
//           .json({ status: false, message: "Memorial not found." });
//       }

//       if (memorial.createdBy.toString() !== req.user.userId) {
//         return res
//           .status(403)
//           .json({ status: false, message: "Forbidden: Unauthorized" });
//       }

//       await uploadGroupedFilesToS3(); // Upload files

//       delete req.body.createdBy;

//       memorial = await Memorial.findByIdAndUpdate(_id, req.body, {
//         new: true,
//         runValidators: true,
//       });

//       return res.json({
//         status: true,
//         message: "Memorial updated successfully",
//         data: memorial,
//       });
//     } else {
//       // ====== Create New ======
//       req.body.createdBy = req.user.userId;

//       await uploadGroupedFilesToS3(); // Upload files
//       console.log(req.body);

//       const newMemorial = await Memorial.create(req.body);

//       return res.status(201).json({
//         status: true,
//         message: "Memorial created successfully",
//         data: newMemorial,
//       });
//     }
//   } catch (error) {
//     console.error("Error in memorial creation/update:", error);
//     return res.status(500).json({
//       status: false,
//       message: "Server Error: " + error.message,
//     });
//   }
// };

exports.createOrUpdateMemorial = async (req, res) => {
  try {
    const { _id } = req.body;
    const files = req.files || [];
 const userId = req.user.userId;

      // =============================================
    // 1. CHECK USER SUBSCRIPTION STATUS
    // =============================================
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }


    // Find active subscription for the user
    const activeSubscription = await UserSubscription.findOne({
      userId: userId,
      status: 'active'
    }).populate('planId');

    // Check if user has premium access
    let hasPremiumAccess = false;
    if (activeSubscription) {
      // Get plan details from active subscription
      const plan = activeSubscription.planId;
      
      // Determine premium access based on plan type
      if (plan.billingPeriod === 'monthly' || plan.billingPeriod === 'one_time') {
        hasPremiumAccess = true;
      }
    }

    // =============================================
    // 2. RESTRICT PREMIUM FEATURES FOR FREE USERS
    // =============================================
    // Check for premium feature attempts
    const attemptingVideoUpload = files.some(f => f.fieldname === 'videoGallery');
    const attemptingDocUpload = files.some(f => f.fieldname === 'documents');
    const attemptingDocPhotoGallery = files.some(f => f.fieldname === 'photoGallery');
console.log(req.body.familyTree,"req.body.familyTree.lengt")
    // ADDED: Check if the user is trying to add family members
    const attemptingFamilyTree = req.body.familyTree && req.body.familyTree.length > 0;

    if ((attemptingVideoUpload || attemptingDocUpload || attemptingDocPhotoGallery || attemptingFamilyTree) && !hasPremiumAccess) {
      return res.status(403).json({
        status: false,
        // UPDATED: Modified the error message to include Family Tree
        message: "Photo, Video, document uploads, and Family Tree require a premium subscription",
        actionCode: "UPGRADE_REQUIRED"
      });
    }

    // Parse deleted files from request body
    const deletedFiles = {
      photos: req.body.deletedPhotos ? JSON.parse(req.body.deletedPhotos) : [],
      videos: req.body.deletedVideos ? JSON.parse(req.body.deletedVideos) : [],
      documents: req.body.deletedDocuments ? JSON.parse(req.body.deletedDocuments) : []
    };

    // Helper: Group files by fieldname
    const groupedFiles = files.reduce((acc, file) => {
      if (!acc[file.fieldname]) acc[file.fieldname] = [];
      acc[file.fieldname].push(file);
      return acc;
    }, {});

    // Upload all grouped files to S3 and handle file management
    const processFiles = async (existingMemorial = null) => {
      const fileFields = [
        "photoGallery",
        "profileImage",
        "videoGallery",
        "documents",
      ];

      for (const field of fileFields) {
        // Initialize with existing files if updating
        const existingFiles = existingMemorial ? existingMemorial[field] || [] : [];

        if (field === "profileImage") {
          // Profile image is special - always replace if new one is uploaded
          if (groupedFiles[field]) {
            const url = await uploadFileToS3(
              groupedFiles[field][0],
              "memorials/" + field
            );
            req.body[field] = url;

            // Delete old profile image if it exists
            if (existingMemorial?.profileImage) {
              const oldKey = existingMemorial.profileImage.split('/').slice(3).join('/');
              await deleteFileFromS3(oldKey);
            }
          } else if (existingMemorial) {
            // Keep existing profile image if no new one uploaded
            req.body[field] = existingMemorial.profileImage;
          }
        } else {
          // For galleries (photos, videos, documents)
          const currentUrls = [];

          // 1. Process existing files (filter out deleted ones)
          if (Array.isArray(existingFiles)) {
            for (const url of existingFiles) {
              if (!deletedFiles[field === 'photoGallery' ? 'photos' :
                field === 'videoGallery' ? 'videos' : 'documents'].includes(url)) {
                currentUrls.push(url);
              } else {
                // Delete from S3 if marked for deletion
                const key = url.split('/').slice(3).join('/');
                await deleteFileFromS3(key);
              }
            }
          }

          // 2. Add newly uploaded files
          if (groupedFiles[field]) {
            for (const file of groupedFiles[field]) {
              if (file) {
                const url = await uploadFileToS3(file, "memorials/" + field);
                if (url) {
                  currentUrls.push(url);
                }
              }
            }
          }

          req.body[field] = currentUrls;
        }
      }
    };

    if (_id) {
      // ====== Update Existing ======
      let memorial = await Memorial.findById(_id);
      if (!memorial) {
        return res
          .status(404)
          .json({ status: false, message: "Memorial not found." });
      }

      if (memorial.createdBy.toString() !== req.user.userId) {
        return res
          .status(403)
          .json({ status: false, message: "Forbidden: Unauthorized" });
      }

      await processFiles(memorial); // Process files with existing memorial data
      delete req.body.createdBy;

      memorial = await Memorial.findByIdAndUpdate(_id, req.body, {
        new: true,
        runValidators: true,
      });

      return res.json({
        status: true,
        message: "Memorial updated successfully",
        data: memorial,
      });
    } else {
      // ====== Create New ======
      req.body.createdBy = req.user.userId;
      await processFiles(); // Process files for new memorial

      const newMemorial = await Memorial.create(req.body);

      return res.status(201).json({
        status: true,
        message: "Memorial created successfully",
        data: newMemorial,
      });
    }
  } catch (error) {
    console.error("Error in memorial creation/update:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};



exports.viewAndScanMemorialCount = async (req, res) => {
  const { memorialId, isScan } = req.body;

  try {
    const updateFields = {
      $inc: { viewsCount: 1 },
    };

    if (isScan) {
      updateFields.$inc.scanCount = 1;
    }

    const memorial = await Memorial.findByIdAndUpdate(
      memorialId,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found" });
    }

    res.json({
      status: true,
      message: isScan ? "View & Scan count updated" : "View count updated",
      data: {
        viewsCount: memorial.viewsCount,
        scanCount: memorial.scanCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Server Error: " + error.message,
    });
  }
};

