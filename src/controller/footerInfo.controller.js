const asyncHandler = require('express-async-handler');
const { StatusCodes } = require('http-status-codes');
const FooterInfo = require('../models/footerInfo');

const createFooterInfo = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  if (!phone && !email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'Request is empty' });
  }
  const footerInfo = await FooterInfo.create({ phone, email });
  res.status(StatusCodes.OK).json(footerInfo);
});

const getFooterInformation = asyncHandler(async (req, res) => {
  const footerInfo = await FooterInfo.find();
  res.status(StatusCodes.OK).json(footerInfo);
});

const updateFooterInfo = asyncHandler(async (req, res) => {
  const { phone, email } = req.body;
  if (!phone && !email) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: 'Request is empty' });
  }

  const footerInfo = await FooterInfo.findOne();

  if (footerInfo) {
    footerInfo.phone = phone ?? footerInfo.phone;
    footerInfo.email = email ?? footerInfo.email;
    await footerInfo.save();
  }

  res.status(StatusCodes.OK).json(footerInfo);
});

module.exports = { updateFooterInfo, getFooterInformation, createFooterInfo };
