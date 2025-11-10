# Kedil Admin Panel

A comprehensive admin panel for managing the Kedil financial management system. Built with Next.js, TypeScript, React Query, and shadcn/ui components.

## Features

- **User Management**: View and manage all registered users
- **Bank Master**: CRUD operations for bank master records with image upload support
- **Categories**: Full CRUD operations for budget categories
- **Analysis & Reports**: Financial analysis with charts and statistics
- **Admin Authentication**: Simple password-based authentication
- **Modern UI**: Clean, minimal design using shadcn/ui components
- **High Performance**: Optimized with React Query for efficient data fetching

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (default: http://localhost:8080)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file (or copy from `.env.example`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login

- Password: `admin123` (or whatever you set in `NEXT_PUBLIC_ADMIN_PASSWORD`)

## Project Structure

```
kedil_admin_panel/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── auth/         # Authentication pages
│   │   ├── users/        # User management
│   │   ├── bank-master/  # Bank master CRUD
│   │   ├── categories/   # Category management
│   │   ├── dashboard/    # Dashboard overview
│   │   └── analysis/     # Analysis & reports
│   ├── components/       # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Layout components
│   │   └── auth/         # Auth components
│   ├── lib/              # Utilities and API clients
│   │   ├── api/          # API client functions
│   │   └── hooks/        # React Query hooks
│   └── types/            # TypeScript types
└── public/               # Static assets
```

## API Integration

The admin panel connects to the Kedil backend API. Make sure the backend is running and accessible at the URL specified in `NEXT_PUBLIC_API_URL`.

### API Endpoints Used

- `/api/users` - User management
- `/api/bank-master` - Bank master operations
- `/api/categories` - Category operations
- `/api/categories/dashboard` - Dashboard data
- `/api/categories/search` - Category search

## Features in Detail

### Users Page
- View all registered users
- View detailed user information
- Search and filter capabilities

### Bank Master Page
- Create new banks with logo upload
- View all banks in a table
- Delete banks
- Auto-generates slug and short name if not provided

### Categories Page
- Create, update, and delete categories
- View category details including allocated amounts
- Group categories by groups
- Auto-create groups if not provided

### Analysis Page
- Financial overview with key metrics
- Interactive charts (Bar and Line charts)
- Date range filtering
- Category and group breakdowns
- Real-time data visualization

## Technologies Used

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **React Query** - Data fetching and caching
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **Recharts** - Chart library
- **Axios** - HTTP client
- **Lucide React** - Icons

## Development

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8080)
- `NEXT_PUBLIC_ADMIN_PASSWORD` - Admin login password (default: admin123)

## Security Notes

⚠️ **Important**: The admin panel uses a simple password-based authentication stored in environment variables. For production use, consider implementing:

- Proper authentication with JWT tokens
- Role-based access control
- Session management
- Rate limiting
- HTTPS only

## License

Private - Kedil Project
