const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,    
    pass: process.env.EMAIL_PASS    
  }
});

// מייל איפוס סיסמא
exports.sendPasswordResetEmail = async (to, token) => {
  const resetLink = `http://localhost:3000/reset-password?token=${token}`; // לינק לפרונט

  await transporter.sendMail({
    from: `"Travel Social Network" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Instructions',
    html: `
      <h2>Reset Your Password</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>If you did not request this, please ignore this email.</p>
    `
  });
};

// מייל ברוכים הבאים למשתמש חדש
exports.sendWelcomeEmail = async (to, fullName) => {
  await transporter.sendMail({
    from: `"Travel Social Network" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Welcome to Travel Social Network!',
    html: `
      <h2>Hi ${fullName},</h2>
      <p>Welcome to our social travel platform! We're excited to have you on board 🌍</p>
      <p>You can now create your profile, connect with travelers, join groups and share your trips!</p>
      <br>
      <p>Enjoy the journey 🚀</p>
    `
  });
};
