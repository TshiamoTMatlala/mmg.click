import crypto from "crypto";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

const placeOrderPayFast = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "PayFast",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    const payfastData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: `${process.env.FRONTEND_URL}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/verify?success=false&orderId=${newOrder._id}`,
      notify_url: `${process.env.BACKEND_URL}/api/order/payfast/notify`,
      amount: amount,
      item_name: `Order #${newOrder._id}`,
    };

    const queryString = new URLSearchParams(payfastData).toString();
    const signature = crypto
      .createHash("md5")
      .update(queryString)
      .digest("hex");

    const paymentUrl = `${process.env.PAYFAST_BASE_URL}?${queryString}&signature=${signature}`;
    res.status(200).json({ success: true, paymentUrl });
  } catch (error) {
    console.error("Error initializing PayFast payment:", error);
    res
      .status(500)
      .json({ success: false, message: "Payment initialization failed." });
  }
};

// Handle PayFast IPN (Instant Payment Notification)
const handlePayFastIPN = async (req, res) => {
  try {
    // Validate IPN and update order status
    const { orderId } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { payment: true });
    res.status(200).send("Payment successful");
  } catch (error) {
    console.error("Error handling PayFast IPN:", error.message);
    res.status(500).json({ error: "Failed to handle payment notification" });
  }
};

export { placeOrderPayFast, handlePayFastIPN };
