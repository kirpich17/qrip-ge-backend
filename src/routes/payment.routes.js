// routes/paymentRoutes.js
const Router=require('express');
const  {initiatePayment} = require('../controller/payment.controller');
const { isAuthenticated, isUser } =require('../middlewares/auth.middleware');

require
// import { protect } from '../middleware/authMiddleware.js'; // To get req.user.id

const paymentRouter = Router();

paymentRouter.post('/initiate',  isAuthenticated,
  isUser, initiatePayment);


module.exports= paymentRouter;