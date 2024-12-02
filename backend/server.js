import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import 'dotenv/config';
import PayFast from 'payfast';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Database and Cloudinary Setup
connectDB();
connectCloudinary();

// Middleware
app.use(express.json());
app.use(bodyParser.json()); // For parsing JSON payloads
app.use(cors());

// PayFast Configuration
const payfastConfig = {
  merchantId: process.env.PAYFAST_MERCHANT_ID, // Use environment variables for sensitive data
  merchantKey: process.env.PAYFAST_MERCHANT_KEY,
  passPhrase: process.env.PAYFAST_PASSPHRASE || '', // Optional passphrase
  sandbox: true, // Set to `false` for production
};

const payfast = new PayFast(payfastConfig);

// PayFast Payment Endpoint
app.post('/api/payment', (req, res) => {
  try {
    const paymentData = {
      amount: req.body.amount,
      itemName: req.body.itemName,
      returnUrl: req.body.returnUrl,
      cancelUrl: req.body.cancelUrl,
      notifyUrl: req.body.notifyUrl,
    };

    const paymentUrl = payfast.getPaymentUrl(paymentData);
    res.status(200).json({ paymentUrl });
  } catch (error) {
    console.error('Error initiating payment:', error.message);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// PayFast Response Handling
app.post('/api/payment/response', (req, res) => {
  try {
    const paymentResponse = payfast.getPaymentResponse(req.body);

    if (paymentResponse.isValid()) {
      res.status(200).send('Payment successful');
    } else {
      res.status(400).send('Payment failed');
    }
  } catch (error) {
    console.error('Error handling payment response:', error.message);
    res.status(500).json({ error: 'Failed to handle payment response' });
  }
});

// API Endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);

app.get('/', (req, res) => res.send('API is Working'));

// Start Server
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
