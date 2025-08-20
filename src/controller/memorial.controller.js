// controllers/memorial.controller.js

const { uploadFileToS3, deleteFileFromS3 } = require("../config/configureAWS");
const memorialModel = require("../models/memorial.model");
const Memorial = require("../models/memorial.model");
const MemorialPurchase = require("../models/MemorialPurchase");
const SubscriptionPlan = require("../models/SubscriptionPlan");
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
    // const userId=req.user.userId
    const memorial = await Memorial.findOne({
      _id: req.params.id,
      isPublic: true,
      status: "active",
    })
    

      // FIX: Populate 'purchase', and then the 'planId' inside of it.
    .populate({
      path: 'purchase',
      populate: {
        path: 'planId',
        model: 'SubscriptionPlan' // Explicitly state the model for clarity
      }
    });
 
    console.log("🚀 ~ memorial:", memorial)

    if (!memorial) {
      return res
        .status(404)
        .json({ status: false, message: "Memorial not found." });
    }

    // Convert to plain object to modify
    const memorialData = memorial.toObject();
    
       // FIX: Determine plan name based on the correctly populated path.
    if (memorial.purchase && memorial.purchase.planId && memorial.purchase.planId.name) {
      memorialData.planName = memorial.purchase.planId.name;
    } 

    // Remove internal subscription details from response
   delete memorialData.purchase;

    res.json({ status: true, data: memorialData });
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

    let userPlan;
    let memorial;
    
    // Check if we're updating an existing memorial
    if (_id) {
      memorial = await Memorial.findById(_id);
      console.log("🚀 ~ memoria22222l:", memorial)
      if (!memorial) {
        return res.status(404).json({ status: false, message: "Memorial not found." });
      }

      // --- THIS IS THE SECURITY CHECK ---
      // If the memorial has already been set to 'active', it means it was already created.
      // Do not allow another "creation" from this endpoint.
      if (memorial.memorialPaymentStatus === 'active') {
        return res.status(403).json({ 
            status: false, 
            message: "This memorial has already been created. To make changes, please edit it from your dashboard." ,
                actionCode: "UPGRADE_REQUIRED"
        });
      }
      // The only valid status to proceed from here should be 'draft'
      if (memorial.memorialPaymentStatus !== 'draft') {
        return res.status(403).json({ status: false, message: "This memorial is not in a valid state for creation." ,    actionCode: "UPGRADE_REQUIRED"});
      }
      // --- END SECURITY CHECK ---

      // Authorization check
      if (memorial.createdBy.toString() !== userId) {
        return res.status(403).json({
          status: false,
          message: "Forbidden: You do not have permission to update this memorial.",
        });
      }
      
      // Get the plan from the memorial's purchase
      if (memorial.purchase) {
        const purchase = await MemorialPurchase.findById(memorial.purchase).populate('planId');
        console.log("🚀 ~ memorialpurchase:", purchase)
     userPlan = purchase ? purchase.planId : null;
      } else {
        userPlan = await SubscriptionPlan.findOne({ planType: 'minimal' });
      }
    } else {
      // For new memorials, use minimal plan as default until purchase is made
      userPlan = await SubscriptionPlan.findOne({ planType: 'minimal' });
    }
    if (!userPlan) {
      return res.status(500).json({ status: false, message: "Could not determine subscription plan." });
    }
    
    console.log("🚀 ~ userPlan:", userPlan)
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

     const familyTree = req.body.familyTree || [];

    // Check plan restrictions based on one-time purchase model
    if (userPlan.planType === 'minimal') {
      // Minimal plan restrictions (1 photo, no videos, no documents, no family tree)
      if (groupedFiles['videoGallery'] && groupedFiles['videoGallery'].length > 0) {
        return res.status(403).json({
          status: false,
          message: "Video uploads require a Medium or Premium plan",
          actionCode: "UPGRADE_REQUIRED"
        });
      }
      
      if (groupedFiles['documents'] && groupedFiles['documents'].length > 0) {
        return res.status(403).json({
          status: false,
          message: "Document uploads require a Premium plan",
          actionCode: "UPGRADE_REQUIRED"
        });
      }
      
      //  if (familyTree.length > 0) {
      //   return res.status(403).json({ status: false, message: "Family tree features require a Medium or Premium plan", actionCode: "UPGRADE_REQUIRED" });
      // }
      
      // Check photo count (minimal allows only 1 photo)
      const existingPhotos = memorial ? memorial.photoGallery.length : 0;
      const newPhotos = groupedFiles['photoGallery'] ? groupedFiles['photoGallery'].length : 0;
      const remainingPhotos = existingPhotos - deletedFiles.photos.length + newPhotos;
      
      if (remainingPhotos > 1) { // Minimal plan allows only 1 photo
        return res.status(403).json({
          status: false,
          message: "Minimal plan allows only 1 photo",
          actionCode: "UPGRADE_REQUIRED"
        });
      }
    } 
    else if (userPlan.planType === 'medium') {
      // Medium plan restrictions (10 photos, videos allowed but check duration, no documents)
      if (groupedFiles['documents'] && groupedFiles['documents'].length > 0) {
        return res.status(403).json({
          status: false,
          message: "Document uploads require a Premium plan",
          actionCode: "UPGRADE_REQUIRED"
        });
      }
      
      // Check photo count (medium allows up to 10 photos)
      const existingPhotos = memorial ? memorial.photoGallery.length : 0;
      const newPhotos = groupedFiles['photoGallery'] ? groupedFiles['photoGallery'].length : 0;
      const remainingPhotos = existingPhotos - deletedFiles.photos.length + newPhotos;
      console.log("🚀 ~ remainingPhotos:", remainingPhotos)
      
      if (remainingPhotos > 10) { // Medium plan allows up to 10 photos
        return res.status(403).json({
          status: false,
          message: "Medium plan allows only 10 photos",
          actionCode: "UPGRADE_REQUIRED"
        });
      }
      
      // Check video count and duration
      if (groupedFiles['videoGallery'] && groupedFiles['videoGallery'].length > 0) {
        const existingVideos = memorial ? memorial.videoGallery.length : 0;
        const newVideos = groupedFiles['videoGallery'].length;
        const remainingVideos = existingVideos - deletedFiles.videos.length + newVideos;
        
        // Medium plan doesn't specify a video limit but check if any videos are allowed
        if (remainingVideos > 0 && !userPlan.allowVideos) {
          return res.status(403).json({
            status: false,
            message: "Video uploads require a Premium plan",
            actionCode: "UPGRADE_REQUIRED"
          });
        }
      }
    }
    // Premium plan has no restrictions

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
          if (groupedFiles[field] && groupedFiles[field].length > 0) {
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
          } else if (existingMemorial && existingMemorial.profileImage) {
            // Keep existing profile image if no new one uploaded
            req.body[field] = existingMemorial.profileImage;
          } else {
            // No profile image to set
            req.body[field] = null;
          }
        } else {
          // For galleries (photos, videos, documents)
          const currentUrls = [];

          // 1. Process existing files (filter out deleted ones)
          if (Array.isArray(existingFiles)) {
            for (const url of existingFiles) {
              const fieldType = field === 'photoGallery' ? 'photos' :
                               field === 'videoGallery' ? 'videos' : 'documents';
              
              if (!deletedFiles[fieldType].includes(url)) {
                currentUrls.push(url);
              } else {
                // Delete from S3 if marked for deletion
                const key = url.split('/').slice(3).join('/');
                await deleteFileFromS3(key);
              }
            }
          }

          // 2. Add newly uploaded files
          if (groupedFiles[field] && groupedFiles[field].length > 0) {
            for (const file of groupedFiles[field]) {
              const url = await uploadFileToS3(file, "memorials/" + field);
              if (url) {
                currentUrls.push(url);
              }
            }
          }

          req.body[field] = currentUrls;
        }
      }
    };


    // Prepare the update payload
    const payload = { ...req.body };
    // --- FIX: Assign the already parsed familyTree object to the payload ---
    payload.familyTree = familyTree;

    if (_id) {
      await processFiles(memorial);
      

        // 2. NOW create the payload from the updated req.body
  const payload = { ...req.body, familyTree };
  delete payload.createdBy;
  
    // --- CONSUME THE CREATION RIGHT ---
      // When saving successfully for the first time, change the status to 'active'.
      payload.memorialPaymentStatus = 'active';

      const updatedMemorial = await Memorial.findByIdAndUpdate(_id, payload, {
        new: true,
        runValidators: true,
      });

      return res.json({ status: true, message: "Memorial updated successfully", data: updatedMemorial });
    } else {
      // 1. Process files first
  await processFiles();
  
  // 2. Create payload from the updated req.body
  const payload = { ...req.body, familyTree, createdBy: userId };

  // 3. Save the correct payload
  const newMemorial = await Memorial.create(payload);
  return res.status(201).json({ status: true, message: "Memorial created successfully", data: newMemorial });
    }
  } catch (error) {
    console.error("Error in memorial creation/update:", error);
    // Provide a more specific error message if it's a known type
    if (error instanceof TypeError) {
        return res.status(500).json({ status: false, message: "Server Error: A data type mismatch occurred. " + error.message });
    }
    return res.status(500).json({ status: false, message: "Server Error: " + error.message });
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


const MAX_DRAFTS_PER_USER = 5; // Prevent abuse

exports. createDraftMemorial = async (req, res) => {
    const userId = req.user.userId;

    try {
        // --- SECURITY CHECK from Flow #1 ---
        // Prevents a single user from creating endless draft memorials.
        const draftCount = await memorialModel.countDocuments({ 
            createdBy: userId, 
            memorialPaymentStatus: 'draft' 
        });

        if (draftCount >= MAX_DRAFTS_PER_USER) {
            return res.status(429).json({ message: 'You have reached the maximum number of draft memorials.' });
        }
        // --- END SECURITY CHECK ---

        // Create a minimal memorial object.
        const newMemorial = new memorialModel({
            createdBy: userId,
            memorialPaymentStatus: 'draft',
            // Set default empty values to satisfy schema validation if needed
            firstName: 'Untitled',
            lastName: 'Memorial',
            birthDate: new Date(),
            deathDate: new Date(),
        });

        await newMemorial.save();

        // Respond with the ID needed for the next step (plan selection).
        res.status(201).json({ memorialId: newMemorial._id });

    } catch (error) {
        console.error("Failed to create draft memorial:", error);
        res.status(500).json({ message: "Error creating draft memorial" });
    }
};
