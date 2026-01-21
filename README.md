# OTT Streaming Platform

A full-stack Netflix-like streaming platform with personalized recommendations, adaptive streaming, and subscription management.

## Features

### Core Functionality
- 🎬 **Content Catalog**: Browse movies and TV series with rich metadata
- 🔐 **Authentication & Authorization**: Secure user registration and login with JWT
- 📺 **Video Streaming**: Adaptive bitrate streaming with HLS/DASH support
- ⏯️ **Resume Playback**: Continue watching from where you left off
- ⭐ **Personalized Recommendations**: ML-powered content suggestions
- 📝 **Watchlist Management**: Save content to watch later
- 💳 **Subscription Management**: Multiple tiers with Stripe integration
- 👤 **User Profiles**: Multiple profiles per account
- 🔍 **Advanced Search**: Search and filter by genre, rating, year, etc.
- 📊 **Watch History**: Track viewing patterns for recommendations

### Technical Features
- **Session Management**: Redis-based session storage
- **Content Delivery**: CDN integration for global content distribution
- **Performance Optimization**: Compression, caching, and lazy loading
- **Security**: Helmet.js, rate limiting, and secure headers
- **Responsive Design**: Mobile-first approach for all devices
- **Real-time Updates**: WebSocket support for live features

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** for data persistence
- **Redis** for session management and caching
- **JWT** for authentication
- **Stripe** for payment processing

### Frontend
- **React** with Hooks
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API calls
- **Video.js** or HLS.js for video playback

## Project Structure

```
ott-streaming-platform/
├── server/                  # Backend application
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   └── index.js            # Entry point
├── client/                 # Frontend application
│   ├── public/             # Static files
│   └── src/
│       ├── components/     # React components
│       ├── pages/          # Page components
│       ├── context/        # Context providers
│       ├── hooks/          # Custom hooks
│       ├── services/       # API services
│       ├── utils/          # Utilities
│       └── App.js          # Root component
└── package.json
```

## Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Redis (v6 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd netflix-clone
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB and Redis**
   ```bash
   # MongoDB
   mongod --dbpath /path/to/data

   # Redis
   redis-server
   ```

5. **Run the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev

   # Backend only
   npm run server

   # Frontend only
   npm run client
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh JWT token
- `GET /api/auth/me` - Get current user

### Content
- `GET /api/content` - Get all content (with pagination)
- `GET /api/content/:id` - Get content by ID
- `GET /api/content/featured` - Get featured content
- `GET /api/content/trending` - Get trending content
- `GET /api/content/search` - Search content

### User
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/watchlist` - Get user watchlist
- `POST /api/users/watchlist/:contentId` - Add to watchlist
- `DELETE /api/users/watchlist/:contentId` - Remove from watchlist

### Playback
- `POST /api/playback/start` - Start playback session
- `POST /api/playback/progress` - Update playback progress
- `GET /api/playback/resume/:contentId` - Get resume point

### Recommendations
- `GET /api/recommendations/personalized` - Get personalized recommendations
- `GET /api/recommendations/similar/:contentId` - Get similar content

### Subscriptions
- `GET /api/subscriptions/plans` - Get subscription plans
- `POST /api/subscriptions/subscribe` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `GET /api/subscriptions/status` - Get subscription status

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Ensure all production environment variables are properly configured in `.env`.

### Deployment Platforms
- **Backend**: Heroku, AWS EC2, DigitalOcean
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: MongoDB Atlas
- **Cache**: Redis Cloud
- **CDN**: AWS CloudFront, Cloudflare

## Performance Optimization

- Content caching with Redis
- Image optimization and lazy loading
- Code splitting and lazy loading components
- CDN for static assets and video delivery
- Database indexing for faster queries
- Response compression
- Rate limiting to prevent abuse

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- HTTP security headers with Helmet.js
- CORS configuration
- Rate limiting
- Input validation and sanitization
- Secure cookie handling
- XSS and CSRF protection

## Future Enhancements

- [ ] Live streaming support
- [ ] Offline download capability
- [ ] Parental controls
- [ ] Multi-language support (i18n)
- [ ] Watch party feature
- [ ] Advanced analytics dashboard
- [ ] Mobile apps (React Native)
- [ ] Smart TV apps
- [ ] Content recommendation ML model improvements
- [ ] Social features (reviews, ratings, sharing)

## License

MIT License - see LICENSE file for details

## Support

For support, email support@ottplatform.com or create an issue in the repository.
