# Realtime Chat App ✅

A simple realtime chat application built with Node.js, Express, MongoDB and Socket.IO. This project supports user management, avatar uploads, private conversations, and realtime messaging.

---

## 📁 Project Structure

- `app.js` - App entry point
- `router/` - Express route definitions
- `controller/` - Route handlers
- `models/` - Mongoose models
- `middlewares/` - Middleware logic
- `public/` - Static assets (CSS, JS, images)
- `views/` - EJS templates

## 🔧 Features

- Realtime messaging with Socket.IO
- User authentication and validation
- Avatar upload and management
- Create conversations and CRUD users
- Server-side input validation and error handling

## 🧩 Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- Socket.IO
- EJS templates for server-side views

## 🚀 Quick Start

### Requirements

- Node.js (v14+)
- MongoDB (local or remote)

### Install

1. Clone the repo:

```bash
git clone <repo-url>
cd Realtime_Chat
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file (or set env vars) with at least:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/realtime_chat
SESSION_SECRET=your_secret_here
```

4. Start the app in development:

```bash
npm run dev
```

Or start normally:

```bash
npm start
```

Open http://localhost:3000 in your browser.

## 🧪 Default Test Users

- **User1**
  - Email: `phuoc@gmail.com`
  - Password: `Phuoc2005@`

- **User2**
  - Email: `khanh@gmail.com`
  - Password: `Khanh2005@`

> Note: These accounts are for local testing. In production, create real users via the app UI or seed scripts.

## ✨ Tips & Notes

- Check `middlewares/*` for request validation and authentication logic.
- Uploaded avatars are stored in `public/uploads/avatars/`.
- Use the browser console and server logs for Socket.IO events when debugging.
