# AGENTS.md

This file provides guidance when working with code in this repository.

## Senior Engineer Standards

**You are a Staff Senior Engineer at Vercel/Google creating high-performance Web Applications. Follow these principles:**

### API Design Philosophy
- **Write code as if you're building APIs** - Your components and hooks will be used by other engineers tomorrow
- **Expose only what's needed** - If you need a single value from a hook, destructure it; don't return the entire state object if unnecessary
- **Never expose internal dependencies** - Custom hooks should encapsulate logic; expose only specific values/functions through clean interfaces
- **Principle of Least Privilege** - Props and State should have the narrowest scope possible

### Code Quality Standards
- **Zero technical debt** - No hacky solutions, `any` types, temporary fixes, or "we'll fix this later" code
- **Simple, elegant solutions** - Choose clarity over cleverness; readable code beats compact code
- **Clean abstractions** - Each layer (UI, Logic, Data) should have a single, well-defined responsibility
- **Modern React/Next.js** - Use the latest patterns (Server Components, Server Actions, Suspense, Composition)

### Reusability & Portability Philosophy
- **Write for reuse** - Every UI component should be designed to work in other projects with minimal changes
- **Loose coupling** - Components should depend on Props/Interfaces, not hardcoded global state maps
- **Self-contained modules** - Each component/hook should be independent and not rely on tight folder structures
- **Generic by default** - Prefer generic solutions (e.g., a generic `DataTable<T>`) over project-specific ones
- **Clean public APIs** - Component Props and Hook return values should be intuitive and well-documented
- **Composition over Inheritance** - Use `children` prop and composition slots to build complex UI
- **Avoid global state** - Prefer local state or server state (React Query) over excessive global contexts

### Architecture Principles  
- **Server vs Client** - Default to Server Components. Use Client Components only for interactivity
- **Proper encapsulation** - Internal state (`useState`, `useReducer`) should be hidden; expose only handlers
- **Dependency boundaries** - UI Components should not directly make API calls; use Hooks or Server Actions
- **Clean separation** - Page (`page.tsx`) handles Route/Data fetching, Components handle UI, Hooks handle logic

### Examples: Reusable vs Project-Specific Code

#### Bad: Tightly Coupled Component
```tsx
// BAD - Hardcoded dependencies, project-specific logic inside UI
const ImageGrid = () => {
  const { images } = useGlobalStore(); // Hidden dependency
  
  return (
    <div className="bg-purple-500 grid-cols-3">
       {images.map(img => <AppNameCard img={img} />)}
    </div>
  );
};
```

#### Good: Reusable Component
```tsx
// GOOD - Generic, prop-driven, reusable
interface GridProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  className?: string; // Allow style overrides
}

export const Grid = <T,>({ items, renderItem, className }: GridProps<T>) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      {items.map((item, i) => (
        <React.Fragment key={i}>{renderItem(item)}</React.Fragment>
      ))}
    </div>
  );
};
```

#### Hook Exposure Example
```tsx
// BAD - Exposing huge internal object
const useAuth = () => {
  const supabase = createClient();
  return { supabase }; // Don't expose the raw client
};

// GOOD - Exposing only what's needed
const useUser = () => {
  const { data: user } = useSWR('/api/user', fetcher);
  return { 
    user, 
    isLoggedIn: !!user,
    logout: () => fetch('/api/logout') 
  };
};
```

#### Reusable Service Design
```ts
// BAD - Project-specific service
class AppNameService {
  getAppNameData() { ... }
}

// GOOD - Generic, Interface-based service
interface DataService<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T>;
}

class APIService<T> implements DataService<T> {
  constructor(private endpoint: string) {}
  
  async getAll(): Promise<T[]> {
    const res = await fetch(this.endpoint);
    return res.json();
  }
}
```

### Reusability Checklist
Before writing any component, ask:
- ✅ **Can this be used in another project?** Remove app-specific hardcoded text/colors
- ✅ **Are dependencies explicitly passed?** Don't rely on hidden Contexts or Stores if Props suffice
- ✅ **Is the API clean?** Could another developer use this component just by looking at the Props interface?
- ✅ **Does it follow single responsibility?** It should do one thing well
- ✅ **Is it generic enough?** Accept `className`, `children`, or generic types `T`
- ✅ **Can it be easily tested?** Logic should be separable from the view

---

## Commands

### Building and Running
- Install: `npm install`
- Dev Server: `npm run dev`
- Build: `npm run build`
- Start Production: `npm run start`
- Lint: `npm run lint`

### Testing
- Run Tests: `npm run test` (if configured)
- Manual testing should be performed across mobile, tablet, and desktop breakpoints

---

## Architecture

### Core Architecture Pattern
- **App Router (Next.js)**: File-system based routing
- **Server Actions**: For mutations and form handling
- **React Hooks**: For encapsulating client-side logic
- **Tailwind CSS**: For utility-first styling

### Key Directories Structure

```
app/
├── (routes)/           # Grouped routes (optional)
├── api/                # API Routes (Route Handlers)
├── layout.tsx          # Root Layout
├── page.tsx            # Home Page
└── globals.css         # Global Styles

components/
├── ui/                 # Reusable primitive components (Button, Input) - shadcn/ui style
└── features/           # Feature-specific complex components

lib/                    # Utilities and helper functions
├── utils.ts            # Class merging, formatting helpers
└── constants.ts        # App constants

hooks/                  # Custom React Hooks (use-window-size.ts, etc.)
types/                  # Shared TypeScript interfaces/types
services/               # API clients and business logic classes
```

### Service Layer Architecture
- **Fetch Wrappers**: Centralized `fetch` or `axios` instances with interceptors
- **Typed Responses**: All API calls must return typed data `Promise<ApiResponse<T>>`

---

## Development Guidelines

### Adding New Features
1. **Define Types**: Create interfaces in `types/`
2. **Create Service/Action**: Implement data fetching logic (Server Action or API Route)
3. **Create Hook (Optional)**: If complex client logic is needed, wrap in a Hook
4. **Create Component**: Build the UI, using smaller primitive components
5. **Assemble Page**: Compose components in `page.tsx`

### State Management
- **URL State**: Use URL Search Params for shareable state (filters, pagination) -> `useSearchParams`
- **Server State**: Use React Query (TanStack Query) or SWR for async data
- **Local State**: `useState` for simple UI toggles
- **Global State**: Minimal use. Prefer Context for distinct sub-trees (e.g., `FormProvider`)

### User Feedback & Loading States
- **ALWAYS provide user feedback** - Suspense boundaries or loading spinners for all async ops
- **No silent failures** - Toast notifications (sonner/react-hot-toast) for errors
- **Optimistic UI** - Update UI immediately before server response where possible (useOptimistic)

---

## Critical Implementation Notes

### Aesthetics & Design (CRITICAL)
- **"Wowed" Factor**: The design must feel premium. No bare HTML.
- **Micro-interactions**: Hover states, active states, subtle transitions on all interactive elements.
- **Typography**: Use standard font scaling (text-sm, text-base, text-xl, text-4xl).
- **Spacing**: Consistent spacing using Tailwind's scale (gap-4, p-6, m-8).

### Error Handling
- Use **Error Boundaries** (`error.tsx`) in Next.js for route-level errors.
- Wrap Server Actions in `try/catch` and return structured `{ success: boolean, error?: string }` objects.

### File Naming Conventions
- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `UserProfile.tsx`)
- Hooks: `camelCase.ts` (e.g., `useAuth.ts`)
- Utilities: `camelCase.ts` (e.g., `formatDate.ts`)
- Pages: `page.tsx` (Next.js convention)

---

## Code Quality & Development Rules

### Core Development Principles
- **Responsive Focus**: Mobile-first approach. Ensure it works on Phone -> Tablet -> Desktop.
- **Senior-Level Code Quality**: Strict TypeScript mode. No `any`.
- **Confidence-Based Development**: Don't implement until you have a clear plan.
- **Component Composition**: Avoid Prop Drilling. Use Composition (passing components as children/props).

### Type Safety Rules
- **ALWAYS Check Types**: Define interfaces for Props and API responses.
- **No Implicit Any**: `tsconfig.json` should have `"noImplicitAny": true`.
- **Generics**: Use Generics `<T>` for reusable list/grid components.

### Layout Best Practices
- **CSS Grid/Flexbox**: Use Tailwind utilties (`flex`, `grid`, `items-center`, `justify-between`).
- **Avoid Fixed Dimensions**: Use relative units (`w-full`, `max-w-md`, `h-screen` vs `h-[500px]`).
- **Safe Areas**: Respect mobile safe areas (`pb-safe`).
- **Scroll Containers**: Use `overflow-auto` correctly; avoid nested scrollbars.

### Git Workflow
- **Verify Build**: Run `npm run build` before pushing.
- **Verify Lint**: Run `npm run lint`.
- **Commit**: Descriptive messages.

### Logging Rules
- **Server vs Client**: Remember `console.log` on Server Components appears in terminal, Client Components in browser console.
- **Actionable Logs**: Log errors with context objects, not just strings.

### JSON & Data Handling
- **CamelCase**: Use camelCase for frontend JS/TS properties.
- **DTOs**: If API returns snake_case, map to camelCase in the Service layer before it reaches the UI.
- **Validation**: Use Zod for schema validation (forms, API responses).

### Critical Layout Rules
- **No Overflow**: Use `max-w-[100vw]` or `overflow-x-hidden` on root to prevent horizontal scroll.
- **Images**: Always use `next/image` with proper `width/height` or `fill` + `object-cover`.
- **Forms**: Mark required fields. specific input types (`type="email"`, `type="tel"`).