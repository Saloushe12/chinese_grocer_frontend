# 华商超市 - Chinese Grocery Store Frontend

A modern Vue.js 3 application for a Chinese grocery store, featuring a bilingual interface (Chinese/English) and a responsive design.

## Features

- **Bilingual Interface**: Chinese and English support throughout the application
- **Responsive Design**: Mobile-first design that works on all devices
- **Modern Stack**: Built with Vue 3, TypeScript, Vite, and Pinia
- **Product Catalog**: Browse and search through Chinese grocery products
- **Category Filtering**: Filter products by category (Rice, Sauces, Vegetables, etc.)
- **Beautiful UI**: Clean, modern design with Chinese cultural elements

## Technology Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type safety and better development experience
- **Vite** - Fast build tool and development server
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **ESLint + Prettier** - Code quality and formatting
- **Vitest** - Unit testing framework

## Project Structure

```
src/
├── components/          # Reusable Vue components
├── views/              # Page components
│   ├── HomeView.vue    # Homepage with featured products
│   ├── ProductsView.vue # Product catalog page
│   └── AboutView.vue   # About page
├── router/             # Vue Router configuration
├── stores/             # Pinia stores
└── assets/             # Static assets
```

## Getting Started

### Prerequisites

- Node.js (version 20.19.0 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

### Testing

Run unit tests:
```bash
npm run test:unit
```

### Code Quality

Lint the code:
```bash
npm run lint
```

Format the code:
```bash
npm run format
```

## Pages

- **Home (首页)**: Welcome page with featured products and store information
- **Products (商品)**: Product catalog with search and filtering capabilities
- **About (关于我们)**: Information about the store, mission, and team

## Features in Detail

### Product Catalog
- Search functionality with Chinese and English support
- Category-based filtering (Rice, Sauces, Vegetables, Tea, Frozen)
- Product cards with bilingual names and descriptions
- Add to cart functionality (ready for backend integration)

### Responsive Design
- Mobile-first approach
- Adaptive layouts for different screen sizes
- Touch-friendly interface elements

### Cultural Elements
- Traditional Chinese color scheme (red and gold)
- Bilingual content throughout
- Cultural context in product descriptions and store information

## Future Enhancements

- Shopping cart functionality
- User authentication
- Order management
- Payment integration
- Inventory management
- Multi-language support expansion

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
