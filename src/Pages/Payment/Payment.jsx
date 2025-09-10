// src/Pages/Payment/Payment.jsx
import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CartContext } from "../../Context/CartContext";
import axios from "axios";
import { toast } from "react-toastify";
import "./Payment.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID || ""; // publishable key

// Loads Razorpay SDK if not already loaded
const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Razorpay SDK failed to load. Check network."));
    document.body.appendChild(script);
  });

export default function Payment() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCartItems, items: ctxCartItems } = useContext(CartContext) || {};
  const token = localStorage.getItem("token");

  // order payload passed from ShoppingCart via navigate(..., { state: { orderPayload }}).
  const orderPayload = location?.state?.orderPayload ?? null;

  // Demo fallback amount rupees (used only when there's no orderPayload)
  const forcedAmountInRupees = 2;

  useEffect(() => {
    if (!orderPayload) {
      toast.info("No order data found — demo checkout enabled. Amount forced to ₹2.");
    }
  }, [orderPayload]);

  const buildHeaders = () => {
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  };

  const onPayClicked = async () => {
    setLoading(true);
    try {
      // load razorpay sdk
      await loadRazorpayScript();

      // Calculate amountInPaise:
      // - If orderPayload exists: take totalAmount (rupees) -> paise, ensure at least 100 paise
      // - Otherwise: demo fixed ₹2 => 200 paise
      const calculatedPaise = 200;
      // orderPayload
      //   ? Math.round((orderPayload.totalAmount ?? 0) * 100)
      //   : Math.round(forcedAmountInRupees * 100);

      // Protect against amounts below Razorpay minimum; ensure at least 100 paise (₹1)
      const amountInPaise = Math.max(100, calculatedPaise);

      // Create an order on backend. Send amountInPaise.
      const createRes = await axios.post(
        `${API_BASE}/api/create-order`,
        { amountInPaise },
        { headers: buildHeaders() }
      );

      if (!createRes.data || !createRes.data.id) {
        throw new Error(createRes.data?.error || "Order creation on backend failed");
      }

      const razorpayOrder = createRes.data; // { id, amount, currency }

      const options = {
        key: RAZORPAY_KEY,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || "INR",
        name: "My Demo Store",
        description: orderPayload
          ? `Order payment — ₹${(razorpayOrder.amount / 100).toFixed(2)}`
          : `Demo checkout — ₹${forcedAmountInRupees}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: orderPayload?.customerName || "",
          email: orderPayload?.customerEmail || "",
          contact: orderPayload?.customerPhone || "",
        },
        handler: async function (response) {
          // response: razorpay_payment_id, razorpay_order_id, razorpay_signature
          try {
            // Verify signature on backend
            const verifyRes = await axios.post(
              `${API_BASE}/api/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              { headers: buildHeaders() }
            );

            if (!verifyRes.data || !verifyRes.data.ok) {
              toast.error("Payment verification failed. Please contact support.");
              console.error("verify response", verifyRes.data);
              return;
            }

            // If we have an orderPayload, create the final order on backend
            if (orderPayload) {
              // NOTE: set status to an enum value your Order model accepts.
              // The previous 'Paid' caused Mongoose enum validation error; using 'Pending' to be safe.
              const orderCreationPayload = {
                ...orderPayload,
                paymentInfo: {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                },
                status: "Pending",
              };

              const orderResp = await axios.post(
                `${API_BASE}/api/orders/add`,
                orderCreationPayload,
                { headers: buildHeaders() }
              );

              if (orderResp.status === 200 || orderResp.status === 201) {
                // clear backend cart (best-effort)
                try {
                  if (orderPayload.userId) {
                    await axios.delete(
                      `${API_BASE}/api/users/cart/remove/${orderPayload.userId}`,
                      { headers: buildHeaders() }
                    );
                  }
                } catch (err) {
                  console.warn("Failed to clear cart on backend:", err?.response?.data || err.message || err);
                }

                // clear frontend cart
                if (typeof setCartItems === "function") setCartItems([]);

                toast.success("Payment successful and order placed!");
                navigate("/profile");
                return;
              } else {
                toast.error(orderResp.data?.message || "Order creation after payment failed.");
                console.error("orderResp", orderResp);
                return;
              }
            }

            // Demo path (no server order)
            toast.success("Payment successful!");
            alert(`Payment successful! Payment id: ${response.razorpay_payment_id}`);
            navigate("/profile");
          } catch (err) {
            console.error("verification/order error:", err?.response?.data || err?.message || err);
            toast.error(err?.response?.data?.message || "Payment verification/ordering failed.");
          }
        },
        modal: {
          ondismiss: function () {
            console.log("Razorpay checkout closed by user");
            toast.info("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (res) {
        console.error("payment.failed:", res);
        toast.error(res?.error?.description || "Payment failed");
      });

      rzp.open();
    } catch (err) {
      console.error("Payment flow error:", err?.response?.data || err?.message || err);
      toast.error(err?.message || "Something went wrong while initiating payment");
      alert(err?.message || "Something went wrong while initiating payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-page" style={{ padding: 20 }}>
      <h2>Checkout</h2>

      {!orderPayload && (
        <>
          <p>
            No order data was passed to this page. Demo checkout will charge{" "}
            <strong>₹{forcedAmountInRupees}</strong>.
          </p>
          <button onClick={onPayClicked} disabled={loading} style={{ padding: "10px 14px", fontSize: 16 }}>
            {loading ? "Processing…" : `Pay ₹${forcedAmountInRupees}`}
          </button>
        </>
      )}

      {orderPayload && (
        <>
          <div style={{ marginBottom: 12 }}>
            <h4>Amount to pay: ₹{(orderPayload.totalAmount ?? 0).toFixed(2)}</h4>
            <p>Items: {orderPayload.items?.length ?? 0}</p>
            <p>Shipping: {orderPayload.shippingAddress || "—"}</p>
          </div>

          <button onClick={onPayClicked} disabled={loading} style={{ padding: "10px 14px", fontSize: 16 }}>
            {loading ? "Processing…" : `Pay ₹${(orderPayload.totalAmount ?? 0).toFixed(2)}`}
          </button>
        </>
      )}

      {ctxCartItems && Array.isArray(ctxCartItems) && (
        <div style={{ marginTop: 18 }}>
          <h4>Your cart preview ({ctxCartItems.length})</h4>
          <ul>
            {ctxCartItems.slice(0, 6).map((it, i) => (
              <li key={i}>
                {it.title || it.name || "Item"} — {it.qty ?? it.quantity ?? 1} × {it.price != null ? `₹${it.price}` : "N/A"}
              </li>
            ))}
            {ctxCartItems.length > 6 && <li>...and more</li>}
          </ul>
        </div>
      )}

    </div>
  );
}
