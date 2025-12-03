const express = require('express');
const {
  createFooterInfo,
  getFooterInformation,
  updateFooterInfo,
} = require('../controller/footerInfo.controller');

const FooterInfoRouter = express.Router();

FooterInfoRouter.post('/footerInfo', createFooterInfo);
FooterInfoRouter.get('/footerInfo', getFooterInformation);
FooterInfoRouter.patch('/footerInfo', updateFooterInfo);

module.exports = FooterInfoRouter;
