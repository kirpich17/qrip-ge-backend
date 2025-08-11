// routes/paymentRoutes.js
const Router=require('express');
const  {initiatePayment, initiateOneTimePayment, getActiveSubscription, restartLifeTimeFreePlan, paymentCallbackWebhook} = require('../controller/payment.controller');
const { isAuthenticated, isUser } =require('../middlewares/auth.middleware');
const  chargeRecurringSubscriptions  = require('../service/bog-cron-jobs');

require
// import { protect } from '../middleware/authMiddleware.js'; // To get req.user.id

const paymentRouter = Router();

paymentRouter.post('/initiate',  isAuthenticated,
  isUser, initiatePayment);
paymentRouter.post('/callback', paymentCallbackWebhook);
  paymentRouter.post('/initiate-one-time-payment',  isAuthenticated,
  isUser, initiateOneTimePayment);
  paymentRouter.post('/restart-free', isAuthenticated, isUser, restartLifeTimeFreePlan);
  paymentRouter.get('/active', isAuthenticated, isUser, getActiveSubscription);
paymentRouter.get('/cron', chargeRecurringSubscriptions);
module.exports= paymentRouter;