# Fyno — AI-Powered Personal Finance Companion 💰

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.74%2B-61dafb.svg)](https://reactnative.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248.svg)](https://www.mongodb.com/atlas)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.5--flash-violet.svg)](https://deepmind.google/technologies/gemini/)

> **"You live your life. Fyno remembers your money."**

Fyno is an intelligent, conversational personal finance companion that helps you track, analyze, and optimize your financial life. Unlike traditional rigid budget sheets, Fyno leverages AI to process natural language transactions, generate smart human-readable insights, and keep you engaged with gamified streak tracking.

---

## 🌟 Key Features

*   🤖 **Fynn - AI Financial Assistant**: Speak to Fynn in plain English (e.g., *"Spent $15 on lunch at Chipotle"* or *"I just got paid $1500 for my freelance gig"*). Fynn parses the input, categorizes it, assigns sources, and updates your records automatically.
*   📈 **Smart Insights**: Receive automated weekly and monthly summaries. Fynn analyzes your spending habits to highlight patterns (e.g., *"You spent 12% more on Dining Out this week, mostly on weekends"*).
*   📊 **Visual Analytics**: Interactive and responsive charts (pie charts, bar charts, and line graphs) representing your spending distribution, income vs. expense balance, and historical trends.
*   🔥 **Streak & Habit Building**: A gamified tracking streak system that rewards you for logging your finances daily, helping you build positive money-management habits.
*   🧠 **Daily Reflection**: Correlate your emotional state with your spending habits. Log your mood during transactions to understand how emotions drive your expenses.
*   🌓 **Universal Dark Mode**: Seamless dark, light, or system-default themes built dynamically to match your preference.
*   💵 **Multi-Currency Support**: Track your money in 9 global currencies (USD, EUR, GBP, INR, JPY, CAD, AUD, CHF, CNY) with instant symbol adaptations.
*   📱 **Seamless Mobile Experience**: Features friendly empty states, skeleton loading screens, pull-to-refresh, smooth navigation, and toast notifications.

---

## 🛠️ Tech Stack

### Frontend (Client)
*   **Framework**: [React Native](https://reactnative.dev/) via [Expo (SDK 54)](https://expo.dev/)
*   **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (for transactions, auth, system configuration, and streaks)
*   **Navigation**: [React Navigation](https://reactnavigation.org/) (Bottom Tabs + Native Stack)
*   **Styling**: Custom theme system (colors, typography, shadows, spacing)
*   **UI Components**: React Native SVG, Vector Icons, Safe Area Context, and custom charts via React Native Chart Kit
*   **Form Management**: React Hook Form

### Backend (Server)
*   **Runtime Environment**: [Node.js](https://nodejs.org/)
*   **Framework**: [Express.js](https://expressjs.com/)
*   **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) with [Mongoose ODM](https://mongoosejs.com/)
*   **Security & Auth**: JSON Web Tokens (JWT), `bcryptjs` hashing, `helmet` security headers, and CORS policies
*   **Validation**: Express Validator middleware

### AI Infrastructure
*   **Provider**: Google Gemini API (`gemini-2.5-flash` with graceful fallback to `gemini-3.1-flash-lite`)
*   **Core Logic**: Direct HTTPS REST calls encapsulated in `GeminiProvider`, processing conversational logs into structured financial models.

---

## 📂 Project Structure

```text
Fyno/
├── server/                    # Node.js Express API
│   ├── config/                # Environment variables & database setup
│   ├── controllers/           # Route handler controllers (Auth, Tx, Streaks, Insights)
│   ├── middleware/            # JWT authorization, validation, error handler middlewares
│   ├── models/                # Mongoose database models (User, Transaction, Streak, Insight)
│   ├── routes/                # Express API endpoint routes
│   ├── services/              # Core business services & Fynn AI integration
│   │   └── ai/                # Gemini providers, system prompts, and parser scripts
│   ├── utils/                 # General helpers and response formatters
│   ├── validators/            # Input schema validators (auth & transaction payloads)
│   ├── server.js              # Server entry point
│   └── app.js                 # Express application configuration
│
└── client/                    # React Native Expo App
    ├── assets/                # App icons, splash screens, and static images
    └── src/                   # React Native application source code
        ├── components/        # Reusable UI widgets (cards, skeletons, reflection panels, charts)
        ├── constants/         # Category mappings, source tags, UI presets
        ├── hooks/             # Custom React Hooks (useAuth, useGreeting, useRefresh)
        ├── navigation/        # Bottom tabs, auth screen flows, and main app routing
        ├── redux/             # Redux Store configuration, slices, and selectors
        ├── screens/           # Onboarding, Login/Register, Dashboard, Transactions, Settings
        ├── services/          # Axios instance and API communication layer (api.js)
        ├── theme/             # Design Tokens (colors, spacing, shadows, typography)
        └── utils/             # Async storage helpers, currency and date formatters
```

---

## 🚀 Getting Started

Follow these steps to set up Fyno locally for development.

### Prerequisites

*   Install **Node.js** (v18 or higher recommended)
*   A **MongoDB Atlas** database account
*   An active **Google Gemini API Key** (for Fynn AI features)
*   **Expo Go** app installed on your physical mobile device (iOS/Android), or an active simulator/emulator

---

### 1. Backend Setup ⚙️

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your Environment Variables:
   *   Copy the example environment file:
       ```bash
       cp .env.example .env
       ```
   *   Open the newly created [server/.env](file:///d:/Fyno/server/.env) and populate the values:
       ```env
       PORT=5000
       MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/fyno?retryWrites=true&w=majority
       JWT_SECRET=your_secure_random_jwt_secret_key_here
       JWT_EXPIRES_IN=30d
       NODE_ENV=development
       AI_PROVIDER=gemini
       GEMINI_API_KEY=your_google_gemini_api_key_here
       ```

4. Run the backend development server:
   ```bash
   npm run dev
   ```
   *The server will boot on `http://localhost:5000` (or the configured `PORT`).*

---

### 2. Frontend Setup 📱

1. Navigate to the client directory:
   ```bash
   cd ../client
   ```

2. Install client dependencies:
   ```bash
   npm install
   ```

3. Configure the backend API Base URL:
   *   When testing React Native with Expo on physical devices, the client **cannot** connect to `localhost`. It must resolve to your machine's local IP address.
   *   Find your computer's local IP (e.g., `192.168.1.X` or `10.0.0.X`).
   *   Open [client/src/services/api.js](file:///d:/Fyno/client/src/services/api.js#L5) and set the `BASE_URL`:
       ```javascript
       const BASE_URL = 'http://YOUR_LOCAL_IP:5000/api';
       ```

4. Start the Expo bundler:
   ```bash
   npx expo start
   ```

5. Run on your device:
   *   Open the **Expo Go** app on your mobile phone.
   *   Scan the QR code displayed in your terminal or terminal web interface.
   *   *Note: Ensure your development machine and your mobile device are connected to the exact same Wi-Fi network.*

---

## 🔒 Security Best Practices

*   **Secrets**: Never push your [server/.env](file:///d:/Fyno/server/.env) file to GitHub. The project's root [.gitignore](file:///d:/Fyno/.gitignore) is pre-configured to ignore all environment files.
*   **JWT Salts**: Use a strong random 256-bit key for your `JWT_SECRET` in production environments.
*   **Input Sanitization**: Express Validator has been deployed in all routing channels to reject malicious parameters.

## 📝 License

Distributed under the MIT License. See [LICENSE](file:///d:/Fyno/client/LICENSE) for more information.

---

*Made with ❤️ for financial freedom.*
