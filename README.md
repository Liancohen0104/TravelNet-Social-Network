# 🧭 TravelNet - Social Network for Travelers

## 📖 Overview

**TravelNet** is a full-stack social networking platform built for travelers. It enables users to connect with friends, share travel experiences through posts, join groups, chat in real-time, and receive notifications. Whether you're planning a trip or sharing memories from one, TravelNet brings the global community of travelers together.

---

## 🎥 Demo Video

> Coming soon...

---

## ✨ Key Features

### 🔐 User Authentication

* Sign up, login, and password reset via email
* Secure JWT-based authentication flow
* Role-based access control (guest, user, admin)

### 📋 Posts Feed

* Create, edit, and delete posts
* Upload and display images using Cloudinary
* Like, comment, share and save posts

### 👥 Friends & Groups

* Send and manage friend requests
* Create and join public/private groups
* Extended controls for the group creator

### 📢 Notifications & Chat

* Real-time notifications (likes, comments, friend requests, group actions)
* Live chat between friends using Socket.io

### 🔍 Smart Search

* Search users by name, age, or location
* Search groups by name, description, or privacy type (public/private)
* Search posts by content, author, or creation date

### 📊 Admin Dashboard

* Manage users, posts, and groups
* Visual statistics using D3.js

---

## 📂 Project Structure

```
travel-social-network/
├── Backend/
│   ├── src/
│   │   ├── config/           # Configuration files (DB, cloudinary, etc.)
│   │   ├── controllers/      # Route logic handlers
│   │   ├── middlewares/     # Custom Express middlewares
│   │   ├── models/          # Mongoose schema definitions
│   │   ├── routes/          # API route declarations
│   │   ├── services/        # Business logic and utilities
│   │   ├── sockets/         # Socket.io handlers
│   │   └── app.js           # Express app setup
│   ├── server.js            # App entry point
│   ├── package.json         # Backend metadata and dependencies
│   └── .env                 # Environment variables (not committed)
│
├── Frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── contexts/        # React context providers
│   │   ├── css/             # Global styles
│   │   ├── layouts/         # Page layout wrappers
│   │   ├── pages/           # Main pages (Profile, Home, etc.)
│   │   ├── services/        # Axios/jQuery API functions
│   │   ├── App.js           # Main App component
│   │   ├── AppRouter.js     # Routing configuration
│   │   └── index.js         # Entry point
│   └── package.json         # Frontend metadata and dependencies
│
├── Makefile                # CLI shortcuts for starting the project
├── README.md               # Project documentation
```

---

## 🛠️ Technology Overview

### Backend

* **Node.js + Express** – Backend runtime and server framework
* **MongoDB** – NoSQL database
* **Socket.io** – Real-time features (chat, notifications)
* **Cloudinary** – Image storage
* **Gmail SMTP** – Email sending (password resets, summaries)

### Frontend

* **React** – UI components and logic
* **React Router** – Navigation
* **jQuery (AJAX)** – API communication
* **CSS** – Styling and layout

### Tools & Libraries

* **dotenv** – Loads environment variables from `.env`
* **D3.js** – Data visualization (graphs)

---

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd travel-social-network
```

### 2. Create a `.env` File in the Project Root with:

```env
# === 🌐 Server ===
PORT=4000

# === 🗄️ Database ===
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/travelnet_db?retryWrites=true&w=majority

# === 🔐 Auth ===
JWT_SECRET=your_custom_jwt_secret_here

# === 📩 Email ===
EMAIL_USER=your_email_address@gmail.com
EMAIL_PASS=your_app_password_here

# === ☁️ Cloudinary ===
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

> ⚠️ **Important:** Do NOT commit the `.env` file to Git. Keep it private.

---

### 3. ℹ️ Environment Variable Setup Instructions

#### 🔐 JWT\_SECRET

To generate a secure secret key for token encryption, run:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the generated value and paste it in `JWT_SECRET`.

#### 🗄️ MONGO\_URI

1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com/) and log in or sign up
2. Create a new **project** and **cluster** (you can use the free tier)
3. Go to **Database > Connect > Drivers**, and copy the connection string:

```
mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/travelnet_db?retryWrites=true&w=majority
```

4. Replace `<username>`, `<password>`, and `<cluster-name>` with your actual credentials
5. Paste the result into `MONGO_URI`

#### 📩 Gmail App Password Setup

1. Go to [Google My Account](https://myaccount.google.com/)
2. Enable 2-Step Verification if not already enabled
3. Under **Security**, go to **App Passwords**
4. Generate a new app password for "Other" app: `TravelNet`
5. Paste the 16-digit code into `EMAIL_PASS`
6. Use your Gmail address in `EMAIL_USER`

#### ☁️ Cloudinary Setup

1. Go to [https://cloudinary.com/console](https://cloudinary.com/console) and log in
2. Under the **Dashboard**, locate:

   * **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   * **API Key** → `CLOUDINARY_API_KEY`
   * **API Secret** → `CLOUDINARY_API_SECRET`

---

### 4. Run the Project

```bash
# Start Backend
cd Backend
npm install
npm start

# In a new terminal, start Frontend
cd Frontend
npm install
npm start
```

This will start:
✅ Backend  - [http://localhost:4000](http://localhost:4000)
✅ Frontend - [http://localhost:3000](http://localhost:3000)
