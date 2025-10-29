import nodemailer from 'nodemailer';

// Email service configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

export interface EmailData {
  email: string;
  name: string;
  token: string;
  baseUrl: string;
}

export async function sendPasswordResetEmail(data: EmailData) {
  const { email, name, token, baseUrl } = data;
  
  const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  
  const mailOptions = {
    from: `"T1D Buddy" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your password - T1D Buddy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Password Reset Request</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Hi ${name}, you requested a password reset</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            We received a request to reset your password for your T1D Buddy account. Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      display: inline-block;
                      font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          <p style="font-size: 14px; color: #667eea; word-break: break-all;">
            ${resetUrl}
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
} 