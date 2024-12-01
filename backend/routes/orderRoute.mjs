import express from "express";
import {
  placeOrder,
  placeOrderPayfast,
  handlePayfastNotify,
  verifyStripe,
  verifyPayfast,
  allOrders,
} from "../controllers/orderController.mjs";
import authUser from "../middleware/auth.mjs";

const orderRouter = express.Router();

// Order placement routes
orderRouter.post("/place", authUser, placeOrder);
orderRouter.post("/place-payfast", authUser, placeOrderPayfast);

// Payment verification routes
orderRouter.post("/payfast/notify", handlePayfastNotify);
orderRouter.post("/verify-stripe", authUser, verifyStripe);
orderRouter.post("/verify-payfast", authUser, verifyPayfast);

// Order management routes
orderRouter.post("/list", authUser, allOrders);

export default orderRouter;
