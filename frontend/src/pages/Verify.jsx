import React, { useContext, useEffect } from 'react';
import { ShopContext } from '../context/ShopContext';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const Verify = () => {
  const { navigate, token, setCartItems, backendUrl } = useContext(ShopContext);
  const [searchParams] = useSearchParams();

  const success = searchParams.get('success');
  const orderId = searchParams.get('orderId');
  const paymentMethod = searchParams.get('payment_method') || 'stripe'; // Default to stripe for backward compatibility

  const verifyPayment = async () => {
    try {
      if (!token) {
        return null;
      }

      const endpoint = paymentMethod === 'payfast' 
        ? '/api/order/verify-payfast'
        : '/api/order/verify-stripe';

      const response = await axios.post(
        backendUrl + endpoint, 
        { success, orderId }, 
        { headers: { token } }
      );

      if (response.data.success) {
        setCartItems({});
        toast.success('Payment successful!');
        navigate('/orders');
      } else {
        toast.error('Payment verification failed');
        navigate('/cart');
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message || 'Payment verification failed');
      navigate('/cart');
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Verifying Payment...</h2>
        <p>Please wait while we verify your payment.</p>
      </div>
    </div>
  );
};

export default Verify;