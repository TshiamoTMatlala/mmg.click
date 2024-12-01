import React, { useContext, useState, useEffect } from "react";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { ShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";

const PlaceOrder = () => {
  const [method, setMethod] = useState("cod");
  const {
    navigate,
    backendUrl,
    token,
    cartItems,
    setCartItems,
    getCartAmount,
    delivery_fee,
    products,
  } = useContext(ShopContext);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
  });

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setFormData((data) => ({ ...data, [name]: value }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      let orderItems = [];
      for (const itemId in cartItems) {
        const quantity = cartItems[itemId];
        if (quantity > 0) {
          const itemInfo = products.find((product) => product._id === itemId);
          if (itemInfo) {
            orderItems.push({
              ...itemInfo,
              quantity
            });
          }
        }
      }

      const orderData = {
        userId: token,
        address: formData,
        items: orderItems,
        amount: getCartAmount() + delivery_fee,
      };

      console.log("Submitting order:", orderData);

      if (method === "cod") {
        const response = await axios.post(
          `${backendUrl}/api/order/place`,
          orderData,
          { headers: { token } }
        );
        if (response.data.success) {
          setCartItems({});
          navigate("/orders");
          toast.success("Order placed successfully!");
        }
      } else if (method === "fastpay") {
        console.log("Initiating PayFast payment...");
        try {
          const response = await axios.post(
            `${backendUrl}/api/order/place-payfast`,
            orderData,
            { headers: { token } }
          );
          
          if (response.data.success && response.data.paymentUrl) {
            console.log("PayFast payment URL received");
            localStorage.setItem("pendingOrder", JSON.stringify({
              orderId: response.data.orderId,
              amount: orderData.amount,
              items: orderItems
            }));
            
            window.location.href = response.data.paymentUrl;
          } else {
            console.error("Invalid PayFast response:", response.data);
            toast.error(response.data.message || "Failed to initialize payment");
          }
        } catch (error) {
          console.error("PayFast initialization error:", error.response || error);
          toast.error(error.response?.data?.message || "Failed to initialize payment");
        }
      }
    } catch (error) {
      console.error("Order placement error:", error);
      toast.error(error.response?.data?.message || "Failed to place order");
    }
  };

  return (
    <form
      onSubmit={onSubmitHandler}
      className="flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t"
    >
      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <Title text1={"DELIVERY"} text2={"INFORMATION"} />
        </div>
        <div className="flex gap-3">
          <input
            required
            onChange={onChangeHandler}
            name="firstName"
            value={formData.firstName}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="First name"
          />
          <input
            required
            onChange={onChangeHandler}
            name="lastName"
            value={formData.lastName}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Last name"
          />
        </div>
        <input
          required
          onChange={onChangeHandler}
          name="email"
          value={formData.email}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="email"
          placeholder="Email address"
        />
        <input
          required
          onChange={onChangeHandler}
          name="street"
          value={formData.street}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="text"
          placeholder="Street"
        />
        <div className="flex gap-3">
          <input
            required
            onChange={onChangeHandler}
            name="city"
            value={formData.city}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="City"
          />
          <input
            onChange={onChangeHandler}
            name="state"
            value={formData.state}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="State"
          />
        </div>
        <div className="flex gap-3">
          <input
            required
            onChange={onChangeHandler}
            name="zipcode"
            value={formData.zipcode}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Zipcode"
          />
          <input
            required
            onChange={onChangeHandler}
            name="country"
            value={formData.country}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Country"
          />
        </div>
        <input
          required
          onChange={onChangeHandler}
          name="phone"
          value={formData.phone}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="tel"
          placeholder="Phone"
        />
      </div>

      <div className="mt-8">
        <div className="mt-8 min-w-80">
          <CartTotal />
        </div>

        <div className="mt-12">
          <Title text1={"PAYMENT"} text2={"METHOD"} />
          <div className="flex gap-3 flex-col lg:flex-row">
            <div
              onClick={() => setMethod("cod")}
              className={`flex items-center gap-3 border p-2 px-3 cursor-pointer ${
                method === "cod" ? "border-green-500" : ""
              }`}
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "cod" ? "bg-green-400" : ""
                }`}
              ></p>
              <p className="text-gray-500 text-sm font-medium mx-4">
                CASH ON DELIVERY
              </p>
            </div>

            <div
              onClick={() => setMethod("fastpay")}
              className={`flex items-center gap-3 border p-2 px-3 cursor-pointer ${
                method === "fastpay" ? "border-green-500" : ""
              }`}
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "fastpay" ? "bg-green-400" : ""
                }`}
              ></p>
              <div className="flex flex-col">
                <p className="text-gray-500 text-sm font-medium mx-4">
                  PAY WITH PAYFAST
                </p>
                {method === "fastpay" && (
                  <p className="text-xs text-gray-400 mx-4 mt-1">
                    You will be redirected to PayFast's secure payment page
                  </p>
                )}
              </div>
            </div>
          </div>

          {method === "fastpay" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600 mb-2">
                <i className="fas fa-lock mr-2"></i>
                Secure Payment Information:
              </p>
              <ul className="text-xs text-gray-500 list-disc list-inside">
                <li>Your payment will be processed securely by PayFast</li>
                <li>Credit card details are never stored on our servers</li>
                <li>You&apos;ll be redirected to PayFast&apos;s secure payment page</li>
                <li>Supported cards: Visa, Mastercard, American Express</li>
              </ul>
            </div>
          )}

          <div className="w-full text-end mt-8">
            <button
              type="submit"
              className="bg-black text-white px-16 py-3 text-sm"
            >
              {method === "fastpay" ? "PROCEED TO PAYMENT" : "PLACE ORDER"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
