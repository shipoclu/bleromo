# Bleromofw - Windows 98 Style Mastodon/Pleroma Frontend

## Project Description

This project is a Windows 98-style user interface frontend for Mastodon/Pleroma ActivityPub servers. It simulates a desktop environment where users can interact with the fediverse through a nostalgic Windows 98 interface.

## Reference Application

The reference implementation can be found in `reference/wtkrjs-demo/` which demonstrates basic usage of the wtkrjs library for creating desktop-like windows in a web application.

## Tech Stack

- **React 19** - Modern React with latest features
- **TanStack Query** - Data synchronization and caching for ActivityPub API calls
- **Valtio** - Global state management for application state
- **wtkrjs** - ReactJS toolkit for creating Windows 98-style desktop windows
- **TypeScript** - Type safety and development experience
- **Vite** - Build tool and development server

## Build Commands

- `pnpm run dev` - Start development server
- `pnpm run build` - Create production build
- `pnpm run lint` - Run ESLint
- `pnpm run preview` - Preview production build

## Application States

The application has two primary global states:

1. **Logged Out** (initial state)
   - No start menu visible
   - Single centered login window (cannot be closed/minimized)
   - Accepts fediverse nickname in format: `username@server.tld`
   - Includes "Log In" button

2. **Logged In**
   - Full Windows 98 desktop with start menu
   - Multiple windows for timeline, notifications, compose, etc.
   - State persisted in browser storage

## Code Style Guidelines

### TypeScript / React
- Use TypeScript's strict mode for all code
- Use explicit types for props, state and function returns
- Prefer functional components with hooks over class components
- Use React.FC type for functional components

### Naming & Architecture
- PascalCase for components (e.g., `LoginWindow.tsx`)
- camelCase for variables, functions, and instances
- Use descriptive names for event handlers (e.g., `handleLogin`)
- Component files should match component names

### State Management
- Use Valtio for global application state
- Use TanStack Query for server state and API calls
- Keep component state local when possible

### Error Handling
- Use TypeScript to prevent type errors
- Add proper error boundaries for components that might fail
- Handle async operations with try/catch blocks