import React, { useContext, useEffect, useState } from 'react';
import { ShopContext } from '../context/ShopContext';
import Title from '../components/Title';
import axios from 'axios';
import { toast } from 'react-toastify';

const Orders = () => {
  const { backendUrl, token, currency, products, cartItems, updateQuantity } = useContext(ShopContext);
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Process cart items
  const processedCartItems = [];
  for (const itemId in cartItems) {
    if (typeof cartItems[itemId] === 'object') {
      // Handle nested structure
      for (const size in cartItems[itemId]) {
        const quantity = cartItems[itemId][size];
        if (quantity > 0) {
          const product = products.find(p => p._id === itemId);
          if (product) {
            processedCartItems.push({
              ...product,
              quantity,
              size
            });
          }
        }
      }
    } else {
      // Handle flat structure
      const quantity = cartItems[itemId];
      if (quantity > 0) {
        const product = products.find(p => p._id === itemId);
        if (product) {
          processedCartItems.push({
            ...product,
            quantity
          });
        }
      }
    }
  }

  const loadOrderData = async () => {
    try {
      setLoading(true);
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${backendUrl}/api/order/userorders`,
        {},
        { headers: { token } }
      );

      if (response.data.success) {
        setOrderData(response.data.orders || []);
      } else {
        toast.error('Failed to load orders');
      }
    } catch (error) {
      console.log('Orders error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading-animate w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className='border-t pt-16 container mx-auto px-4'>
      {/* Cart Section */}
      <div className='mb-16'>
        <div className='text-2xl mb-8'>
          <Title text1={'YOUR'} text2={'CART'} />
        </div>
        
        <div className="space-y-4">
          {processedCartItems.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              Your cart is empty
            </div>
          ) : (
            processedCartItems.map((item, index) => (
              <div key={index} className="card-animate bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={item.image[0]} 
                      alt={item.name} 
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      <div className="text-sm text-gray-600">
                        <p>{currency}{item.price}</p>
                        {item.size && <p>Size: {item.size}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => updateQuantity(item._id, Math.max(0, item.quantity - 1), item.size)}
                      className="btn-animate w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item._id, item.quantity + 1, item.size)}
                      className="btn-animate w-8 h-8 flex items-center justify-center bg-green-500 text-white rounded-full hover:bg-green-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Orders Section */}
      <div className='text-2xl mb-8'>
        <Title text1={'MY'} text2={'ORDERS'} />
      </div>

      {orderData.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No orders found. Start shopping to see your orders here!
        </div>
      ) : (
        <div className="space-y-6">
          {orderData.map((order, index) => (
            <div key={index} className='card-animate bg-white rounded-lg shadow p-6'>
              <div className='flex flex-col gap-4'>
                <div className='flex justify-between items-center'>
                  <h3 className='text-lg font-semibold'>Order #{order._id.slice(-6)}</h3>
                  <div className='flex items-center gap-2'>
                    <div className={`w-2 h-2 rounded-full ${
                      order.payment ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className='text-sm font-medium'>
                      {order.payment ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
                
                <div className='space-y-4'>
                  {order.items && order.items.map((item, itemIndex) => (
                    <div key={itemIndex} className='flex items-center gap-4 border-t pt-4'>
                      <img 
                        src={item.image?.[0]} 
                        alt={item.name}
                        className='w-16 h-16 object-cover rounded'
                      />
                      <div className='flex-1'>
                        <h4 className='font-medium'>{item.name}</h4>
                        <div className='text-sm text-gray-600 mt-1'>
                          <p>Price: {currency}{item.price}</p>
                          <p>Quantity: {item.quantity}</p>
                          {item.size && <p>Size: {item.size}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='border-t pt-4 flex justify-between items-center'>
                  <div className='text-sm text-gray-600'>
                    <p>Order Date: {new Date(order.date).toLocaleDateString()}</p>
                    <p>Payment Method: {order.paymentMethod}</p>
                  </div>
                  <div className='text-right'>
                    <p className='font-medium'>Total: {currency}{order.amount}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
