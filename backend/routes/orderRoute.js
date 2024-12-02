import express from 'express';
import crypto from 'crypto';
import orderModel from '../models/orderModel.js';

const router = express.Router();

// Controller for placing an order using PayFast
const placeOrderPayFast = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: 'PayFast',
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
      amount,
      item_name: `Order #${newOrder._id}`,
    };

    const queryString = new URLSearchParams(payfastData).toString();
    const signature = crypto.createHash('md5').update(queryString).digest('hex');

    const paymentUrl = `${process.env.PAYFAST_BASE_URL}?${queryString}&signature=${signature}`;
    res.status(200).json({ success: true, paymentUrl });
  } catch (error) {
    console.error('Error initializing PayFast payment:', error);
    res.status(500).json({ success: false, message: 'Payment initialization failed.' });
  }
};

// Controller for handling PayFast IPN (Instant Payment Notification)
const handlePayFastIPN = async (req, res) => {
  try {
    const { orderId } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { payment: true });
    res.status(200).send('Payment successful');
  } catch (error) {
    console.error('Error handling PayFast IPN:', error.message);
    res.status(500).json({ error: 'Failed to handle payment notification' });
  }
};

// Define Routes
router.post('/payfast/place', placeOrderPayFast);
router.post('/payfast/notify', handlePayFastIPN);

// Export the router as the default export
export default router;
