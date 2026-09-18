# 🍔 Mehrban Fast Food Website

A modern, fast, and responsive full-stack food ordering and restaurant management web application built for **Mehrban Fast Food**.

---

## 🚀 Features

- **Dynamic Interactive Menu**:
  - Full range of food items categorized into Pizzas, Burgers, Shawarma, Sandwiches, Fries, Wings, Nuggets, and Chef Specials.
  - Category filters, real-time search, and detailed item cards with pricing and badges.
- **Cart & Ordering Flow**:
  - Interactive slide-over cart drawer with quantity adjustments and custom notes.
  - Direct WhatsApp order generation formatted with item details, delivery location, and order totals.
- **Admin Dashboard**:
  - Dedicated admin controls to add/edit menu items, toggle availability, manage categories, and update site settings.
  - Image upload support for menu items.
- **Rich Responsive UI**:
  - Built with modern Tailwind CSS styling, custom dark/gold accents, micro-animations, and mobile-friendly navigation.
  - Customer reviews, FAQ section, interactive contact details, and location map.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React icons
- **Backend**: Node.js, Express, Multer (file uploads), CORS
- **Database**: File-based persistent JSON store (`server/data/db.json`)
- **Development Tooling**: Concurrently, PostCSS, Autoprefixer

---

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SalikLeo/Food-Website.git
   cd Food-Website
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running Locally

Start both the backend API server and Vite frontend dev server concurrently:

```bash
npm run dev
```

- **Frontend**: Runs at `http://localhost:5173`
- **Backend API**: Runs at `http://localhost:5000`

### Build for Production

```bash
npm run build
```

---

## 📁 Project Structure

```
Food Website/
├── public/               # Static assets & public images
├── server/               # Express backend API and JSON storage
│   ├── data/             # Persistent JSON database (db.json)
│   ├── db.js             # Database handler & operations
│   └── index.js          # Express API server & routes
├── src/                  # React frontend source code
│   ├── components/       # UI components (Navbar, Menu, Cart, Admin, etc.)
│   ├── context/          # State management (Cart, Menu, Toast)
│   ├── App.jsx           # Main application shell
│   ├── index.css         # Global styles & Tailwind directives
│   └── main.jsx          # React DOM entry point
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 📄 License

This project is licensed under the MIT License.
