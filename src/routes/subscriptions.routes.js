// routes/paymentRoutes.js
const Router = require('express');
const { cancelSubscription, resumeSubscription }= require('../controller/subscription.controller.js');
const { isAuthenticated, isUser } = require('../middlewares/auth.middleware.js');

const subscriptionRouter = Router();

subscriptionRouter.put('/cancel',  isAuthenticated, isUser, cancelSubscription);
subscriptionRouter.put('/resume',  isAuthenticated, isUser, resumeSubscription);

module.exports= subscriptionRouter;