# Bloom Web

Web frontend for the Bloom learning platform — a React single-page application providing an interactive, course-based learning experience inspired by Brilliant.

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **Icons:** Lucide React

## Project Structure

```
src/
├── components/
│   ├── Button.tsx         # Reusable button component
│   ├── Card.tsx           # Content card component
│   ├── Layout.tsx         # App shell with navigation & tab bar
│   ├── LevelBadge.tsx     # Level indicator badge
│   ├── ProgressBar.tsx    # Animated progress bar
│   └── StatBadge.tsx      # Stats display badge
├── context/
│   └── AuthContext.tsx     # Auth state provider (login, register, token)
├── lib/
│   └── api.ts             # API client with typed endpoints
├── pages/
│   ├── AuthPage.tsx        # Login & registration
│   ├── HomePage.tsx        # Dashboard with streaks & recommendations
│   ├── CoursesPage.tsx     # Browse courses by category
│   ├── CourseDetailPage.tsx # Course overview with levels & lessons
│   ├── LessonPage.tsx      # Interactive lesson content player
│   ├── PremiumPage.tsx     # Premium subscription page
│   └── ProfilePage.tsx     # User profile & settings
├── App.tsx                 # Route definitions & protected routes
├── main.tsx                # App entry point
└── index.css               # Global styles & Tailwind directives
```

## Pages & Routing

| Path                 | Page              | Auth Required | Description                        |
|----------------------|-------------------|---------------|------------------------------------|
| `/auth`              | AuthPage          | No            | Login & registration               |
| `/`                  | HomePage          | Yes           | Dashboard with stats & courses     |
| `/courses`           | CoursesPage       | Yes           | Browse all courses by category     |
| `/courses/:courseId` | CourseDetailPage   | Yes           | Course levels & lesson list        |
| `/lesson/:lessonId`  | LessonPage        | Yes           | Interactive lesson content player  |
| `/premium`           | PremiumPage       | Yes           | Premium subscription               |
| `/profile`           | ProfilePage       | Yes           | User profile & settings            |

## Getting Started

### Prerequisites
- Node.js ≥ 18

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:5173` by default.

### Build for Production

```bash
npm run build
npm run preview   # Preview the production build locally
```

> **Note:** The API server ([bloom-api](https://github.com/samphillips38/bloom-api)) must be running. In development, Vite proxies `/api` requests to the backend.
