# Technical README

## Overview

Personal Librarian is a full-stack web application built with modern technologies, featuring a complete authentication system, payment processing, analytics, and a robust database layer. The application follows a monolithic architecture with clear separation between frontend and backend concerns.

## Technology Stack

### Frontend Framework
- **Next.js 15** - React framework with App Router for server-side rendering and routing
- **React 19** - UI library with latest concurrent features
- **TypeScript 5** - Static type checking and enhanced developer experience

### Styling & UI
- **Tailwind CSS 3.4** - Utility-first CSS framework with custom theme configuration
- **Shadcn/ui** - Reusable component library built on Radix UI primitives
- **Radix UI** - Unstyled, accessible UI components including:
  - Dialog, Dropdown, Popover, Toast, Accordion, etc.
- **Framer Motion 11** - Animation library for smooth transitions and interactions
- **Next Themes** - Dark/light mode theme switching
- **Class Variance Authority (CVA)** - Component variant management
- **Tailwind Merge** - Utility for merging Tailwind classes
- **Tailwindcss Animate** - Animation utilities

### Backend & Database
- **PostgreSQL** - Primary database
- **Supabase** - Database hosting and backend services
- **Drizzle ORM 0.33** - Type-safe SQL ORM with migrations
- **Drizzle Kit** - Database migration tool
- **Server Actions** - Next.js server-side functions for data mutations

### Authentication
- **Clerk** - Complete authentication solution with:
  - User management
  - Session handling
  - Protected routes via middleware
  - Social login providers

### Payments
- **Stripe 16** - Payment processing with:
  - Subscription management
  - Webhook handling
  - Payment links (monthly/yearly)
  - Customer portal

### Analytics
- **PostHog** - Product analytics and user tracking
- **Event tracking** - Custom event monitoring

### Additional Libraries
- **React Hook Form 7** - Form state management with validation
- **Zod 3** - Schema validation and type inference
- **Date-fns 3** - Date manipulation utilities
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **CMDK** - Command palette component
- **Recharts 2** - Data visualization charts
- **React Resizable Panels** - Resizable layout panels
- **Embla Carousel** - Carousel/slider component
- **React Day Picker** - Date picker component
- **Input OTP** - One-time password input
- **Vaul** - Drawer component

### Development Tools
- **ESLint** - Code linting with Next.js and Prettier configurations
- **Prettier** - Code formatting
- **Husky** - Git hooks for code quality
- **TypeScript Compiler** - Type checking
- **PostCSS** - CSS processing
- **Dotenv** - Environment variable management

## Architecture

### Project Structure
```
├── actions/                 # Server actions
│   ├── db/                 # Database-related actions
│   ├── chat-service.ts     # Chat functionality
│   └── stripe-actions.ts   # Payment processing
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (marketing)/       # Marketing pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── profile/           # User profile
│   ├── todo/              # Todo functionality
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # Shadcn UI components
│   ├── landing/          # Landing page components
│   ├── sidebar/          # Sidebar components
│   ├── utilities/        # Utility components
│   └── header.tsx        # App header
├── db/                   # Database layer
│   ├── schema/          # Drizzle schemas
│   ├── migrations/      # Database migrations
│   └── db.ts           # Database configuration
├── lib/                 # Utility libraries
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── prompts/            # AI prompts
└── public/             # Static assets
```

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Migrations**: Automated with Drizzle Kit
- **Type Safety**: Generated TypeScript types from schema
- **Connection**: Postgres client with connection pooling

### Authentication Flow
- **Middleware Protection**: Route-based protection using Clerk middleware
- **Session Management**: Automatic session handling
- **Redirects**: Smart redirects for unauthenticated users
- **Protected Routes**: `/todo` and other sensitive areas

### State Management
- **Server State**: Server Actions for data mutations
- **Client State**: React hooks and context
- **Form State**: React Hook Form with Zod validation
- **Theme State**: Next Themes for appearance

## Configuration Files

### Core Configuration
- `next.config.mjs` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS customization with theme variables
- `tsconfig.json` - TypeScript compiler configuration
- `drizzle.config.ts` - Database ORM configuration

### Code Quality
- `.eslintrc.json` - ESLint rules and plugins
- `prettier.config.cjs` - Code formatting rules
- `.husky/` - Git hooks for pre-commit checks

### Build & Deployment
- `package.json` - Dependencies and scripts
- `postcss.config.mjs` - PostCSS configuration
- `components.json` - Shadcn UI configuration

## Development Workflow

### Available Scripts
```bash
npm run dev          # Start development server on port 3007
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run clean        # Run lint:fix and format:write
npm run format:write # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # TypeScript type checking
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run database migrations
npm run analyze      # Bundle analysis
```

### Environment Variables
```bash
# Database (Supabase)
DATABASE_URL=                                    # PostgreSQL connection string

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=                        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=                   # Supabase anon public key
SUPABASE_SERVICE_ROLE_KEY=                       # Supabase service role key (server-only)

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=              # Public Clerk key
CLERK_SECRET_KEY=                               # Private Clerk key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login           # Sign-in page URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup          # Sign-up page URL

# Payments (Stripe)
STRIPE_SECRET_KEY=                              # Stripe secret key
STRIPE_WEBHOOK_SECRET=                          # Webhook endpoint secret
NEXT_PUBLIC_STRIPE_PORTAL_LINK=                # Customer portal URL
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY=        # Yearly subscription link
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY=       # Monthly subscription link

# Analytics (PostHog)
NEXT_PUBLIC_POSTHOG_KEY=                       # PostHog project key
NEXT_PUBLIC_POSTHOG_HOST=                      # PostHog host URL
```

## Key Features

### UI/UX
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Mode**: System preference detection with manual toggle
- **Accessible Components**: ARIA-compliant Radix UI primitives
- **Smooth Animations**: Framer Motion transitions and micro-interactions
- **Modern Design System**: Consistent spacing, typography, and color scheme

### Backend Features
- **Type-Safe Database**: Drizzle ORM with TypeScript integration
- **Server Actions**: Direct server-side functions without API routes
- **Real-time Updates**: Optimistic updates with proper error handling
- **Data Validation**: Zod schemas for runtime type checking

### Security
- **Route Protection**: Middleware-based authentication
- **Type Safety**: Full TypeScript coverage
- **Input Validation**: Server-side validation with Zod
- **Environment Variables**: Secure configuration management

## Performance Optimizations

### Next.js Features
- **App Router**: Latest routing system with layouts and loading states
- **Server Components**: Reduced client-side JavaScript
- **Streaming**: Progressive page loading with Suspense boundaries
- **Image Optimization**: Next.js automatic image optimization

### Build Optimizations
- **Bundle Analysis**: Built-in bundle analyzer
- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Dead code elimination
- **Minification**: Production build optimizations

## Deployment

The application is optimized for deployment on **Vercel** with:
- Automatic deployments from Git
- Environment variable management
- Edge runtime support
- Built-in analytics and monitoring

## Development Guidelines

### Code Quality
- **Linting**: ESLint with Next.js and Tailwind CSS rules
- **Formatting**: Prettier with custom configuration
- **Type Checking**: Strict TypeScript configuration
- **Git Hooks**: Pre-commit validation with Husky

### Best Practices
- **Component Organization**: Clear separation between UI and business logic
- **Type Safety**: Full TypeScript coverage with strict mode
- **Error Handling**: Comprehensive error boundaries and validation
- **Performance**: Optimized rendering with proper memoization
- **Accessibility**: WCAG compliant components and interactions 