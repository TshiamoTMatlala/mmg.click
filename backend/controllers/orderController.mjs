import orderModel from "../models/orderModel.mjs";
import userModel from "../models/userModel.mjs";
import Stripe from "stripe";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// global variables
const currency = "inr";
const deliveryCharge = 10;

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Placing orders using COD Method
const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({ success: true, message: "Order Placed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Placing orders using Stripe Method
const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const { origin } = req.headers;

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "Stripe",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    const line_items = items.map((item) => ({
      price_data: {
        currency: currency,
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    }));

    line_items.push({
      price_data: {
        currency: currency,
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items,
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Verify Stripe
const verifyStripe = async (req, res) => {
  const { orderId, success, userId } = req.body;

  try {
    if (success === "true") {
      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      res.json({ success: true });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Placing orders using PayFast Method
const placeOrderPayfast = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;

    // Validate required environment variables
    if (
      !process.env.PAYFAST_MERCHANT_ID ||
      !process.env.PAYFAST_MERCHANT_KEY ||
      !process.env.PAYFAST_BASE_URL
    ) {
      console.error("Missing required PayFast configuration");
      return res.status(500).json({
        success: false,
        message: "Payment service is not properly configured",
      });
    }

    const orderData = {
      userId,
      items,
      address,
      amount,
      paymentMethod: "payfast",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    // Helper function to format phone number
    function formatPhoneNumber(phone) {
      if (!phone) return "27000000000"; // Default number with country code

      // Remove any non-digit characters
      const digits = phone.replace(/\D/g, "");

      // If it starts with '27' and has 11 digits, it's already in correct format
      if (digits.startsWith("27") && digits.length === 11) {
        return digits;
      }

      // If it starts with '0', remove the 0 and add '27'
      if (digits.startsWith("0")) {
        return `27${digits.slice(1)}`;
      }

      // For any other case, ensure we have 9 digits after '27'
      const lastNineDigits = digits.slice(-9).padStart(9, "0");
      return `27${lastNineDigits}`;
    }

    // Construct payment data (including merchant_key)
    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      amount: amount.toFixed(2),
      item_name: "Order Payment",
      item_description: "Purchase from our store",
      payment_method: "cc",
      m_payment_id: newOrder._id.toString(),
      email_address: address.email,
      cell_number: formatPhoneNumber(address.phone),
      return_url: `${process.env.FRONTEND_URL}/verify?success=true&orderId=${newOrder._id}&payment_method=payfast`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      notify_url: `${process.env.BACKEND_URL}/api/order/payfast/notify`,
      name_first: address.firstName,
      name_last: address.lastName,
      custom_str1: userId,
    };

    // First, create a string of key-value pairs sorted alphabetically
    let signatureString = "";
    const sortedKeys = Object.keys(paymentData).sort();

    // Build the signature string with proper encoding
    sortedKeys.forEach((key) => {
      if (paymentData[key] !== undefined && paymentData[key] !== "") {
        // Encode the value according to PayFast requirements
        const encodedValue = encodeURIComponent(String(paymentData[key]).trim())
          .replace(/%20/g, "+") // Replace spaces with +
          .replace(/%5F/g, "_") // Keep underscores as is
          .replace(/%2E/g, ".") // Keep periods as is
          .replace(/%2D/g, "-"); // Keep hyphens as is

        signatureString += `${key}=${encodedValue}&`;
      }
    });

    // Remove trailing & if it exists
    signatureString = signatureString.replace(/&$/, "");

    // Add passphrase if configured
    if (process.env.PAYFAST_PASSPHRASE) {
      signatureString += `&passphrase=${encodeURIComponent(
        process.env.PAYFAST_PASSPHRASE
      )}`;
    }

    console.log("Generated signature string:", signatureString);

    // Generate MD5 hash for the signature
    const signature = crypto
      .createHash("md5")
      .update(signatureString)
      .digest("hex");

    console.log("Generated signature:", signature);

    // Add signature to payment data
    paymentData.signature = signature;

    // Construct final URL with all parameters
    const queryString = Object.entries(paymentData)
      .filter(
        ([key, value]) =>
          value !== undefined && value !== "" && key !== "passphrase"
      )
      .map(([key, value]) => {
        const encodedValue = encodeURIComponent(String(value).trim())
          .replace(/%20/g, "+")
          .replace(/%5F/g, "_")
          .replace(/%2E/g, ".")
          .replace(/%2D/g, "-");
        return `${key}=${encodedValue}`;
      })
      .join("&");

    const paymentUrl = `${process.env.PAYFAST_BASE_URL}?${queryString}`;

    res.json({
      success: true,
      paymentUrl,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("PayFast payment error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Payment initialization failed",
    });
  }
};

// Handle PayFast payment notification
const handlePayfastNotify = async (req, res) => {
  try {
    const { m_payment_id, pf_payment_id, payment_status } = req.body;

    if (payment_status === "COMPLETE") {
      await orderModel.findByIdAndUpdate(m_payment_id, {
        payment: true,
        payfast_payment_id: pf_payment_id,
      });
      res.status(200).send("OK");
    } else {
      res.status(400).send("Payment incomplete");
    }
  } catch (error) {
    console.error("PayFast notification error:", error);
    res.status(500).send("Error processing notification");
  }
};

// Verify PayFast payment
const verifyPayfast = async (req, res) => {
  const { orderId, success, userId } = req.body;

  try {
    if (success === "true") {
      await orderModel.findByIdAndUpdate(orderId, { 
        payment: true,
        paymentStatus: 'completed'
      });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      res.json({ success: true });
    } else {
      await orderModel.findByIdAndDelete(orderId);
      res.json({ success: false });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// All Orders data for Admin Panel
const allOrders = async (req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// Export all controller functions
export {
  placeOrder,
  placeOrderStripe,
  placeOrderPayfast,
  verifyStripe,
  verifyPayfast,
  handlePayfastNotify,
  allOrders,
};
