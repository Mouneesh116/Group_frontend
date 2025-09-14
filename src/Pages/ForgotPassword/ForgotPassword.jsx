import React, { useState } from 'react';
import './ForgotPassword.css';
import { FaEnvelope } from 'react-icons/fa';
const loginImage ="https://mouneesh-group.s3.us-east-1.amazonaws.com/Images/login.jpg";
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');

  // Step 1: send email to trigger OTP email (backend returns generic message)
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await axios.post(
        'http://16.171.124.12:8000/api/users/forgot-password',
        { email },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Backend returns a generic message (no token). Move to step 2.
      setMessage(response.data?.message || 'If an account with that email exists, an OTP has been sent.');
      setStep(2);
    } catch (error) {
      console.error('Error sending OTP:', error);
      const errMsg = error?.response?.data?.message || 'Failed to send OTP. Please try again.';
      setMessage(errMsg);
    }
  };

  // Step 2: validate OTP (send email + otp). Backend responds with resetToken (short-lived JWT)
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      // IMPORTANT: send email and otp (backend expects { email, otp })
      const response = await axios.post(
        'http://16.171.124.12:8000/api/users/validate-otp',
        { "email": email, "otp":  otp },
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Backend returns { message: 'OTP verified', resetToken }
      const resetToken = response.data?.resetToken;
      if (resetToken) {
        localStorage.setItem('resetToken', resetToken); // store reset JWT for the next step
        setMessage('OTP validated successfully. You may now reset your password.');
        setStep(3);
      } else {
        // Defensive: if backend returned something unexpected
        setMessage(response.data?.message || 'OTP validated, but no reset token received.');
      }
    } catch (error) {
      console.error('Error validating OTP:', error);
      const errMsg = error?.response?.data?.message || 'Invalid OTP. Please try again.';
      setMessage(errMsg);
    }
  };

  // Step 3: reset password (send resetToken and newPassword). Backend expects { resetToken, newPassword }
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match. Please try again.');
      return;
    }

    const resetToken = localStorage.getItem('resetToken');
    if (!resetToken) {
      setMessage('Missing reset token. Start the flow again.');
      setStep(1);
      return;
    }

    try {
      const response = await axios.post(
        'http://16.171.124.12:8000/api/users/reset-password',
        { resetToken, newPassword }, // match backend param names
        { headers: { 'Content-Type': 'application/json' } }
      );

      setMessage(response.data?.message || 'Password reset successfully.');
      localStorage.removeItem('resetToken');
      // redirect to login after a short delay so user can read the message
      setTimeout(() => (window.location.href = '/login'), 800);
    } catch (error) {
      console.error('Error resetting password:', error);
      const errMsg = error?.response?.data?.message || 'Failed to reset password. Please try again.';
      setMessage(errMsg);
    }
  };

  return (
    <div className="forgotpassword-reset-wrapper">
      <div className="forgotpassword-reset-container">
        <div className="forgotpassword-reset-left">
          {step === 1 && (
            <>
              <h2>Forgot Password</h2>
              {message && <p className="forgotpassword-message">{message}</p>}
              <form onSubmit={handleEmailSubmit}>
                <div className="forgotpassword-form-group">
                  <div className="forgotpassword-input-line">
                    <FaEnvelope />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="forgotpassword-reset-btn">Send OTP</button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Validate OTP</h2>
              {message && <p className="forgotpassword-message">{message}</p>}
              <form onSubmit={handleOtpSubmit}>
                <div className="forgotpassword-form-group">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    required
                  />
                </div>
                <button type="submit" className="forgotpassword-reset-btn">Validate OTP</button>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Reset Password</h2>
              {message && <p className="forgotpassword-message">{message}</p>}
              <form onSubmit={handleResetSubmit}>
                <div className="forgotpassword-form-group">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter New Password"
                    required
                  />
                </div>
                <div className="forgotpassword-form-group">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                  />
                </div>
                <button type="submit" className="forgotpassword-reset-btn">Reset Password</button>
              </form>
            </>
          )}
        </div>

        <div className="forgotpassword-reset-right">
          <img src={loginImage} alt="Reset Password" />
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
