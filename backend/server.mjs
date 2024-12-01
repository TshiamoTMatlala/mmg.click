import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.mjs'
import userRouter from './routes/userRoute.mjs'
import productRouter from './routes/productRoute.mjs'
import cartRouter from './routes/cartRoute.mjs'
import orderRouter from './routes/orderRoute.mjs'

// App Config
const app = express()
const port = process.env.PORT || 4000

// Connect to MongoDB
connectDB()
connectCloudinary()

// Middlewares
app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5173', 'https://sandbox.payfast.co.za'],
    credentials: true
}))

// API endpoints
app.use('/api/user', userRouter)
app.use('/api/product', productRouter)
app.use('/api/cart', cartRouter)
app.use('/api/order', orderRouter)

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: "API Working", port: port })
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ 
        success: false, 
        message: 'Something broke!',
        error: err.message 
    })
})

// Start server
app.listen(port, () => {
    console.log('Server started on PORT: ' + port)
    console.log('Frontend URL expected: http://localhost:5173')
    console.log('PayFast webhook URL: http://localhost:' + port + '/api/order/payfast/notify')
})