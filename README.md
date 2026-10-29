# Forest_Management
A forest management app designed to help forestry consultants and private landowners organize property maps, stand data, client records, and management plans, with action timelines and reminders that support healthier, sustainably managed forests.

# Tech Stack

- **Frontend:** Next.js, in `app/`
- **Backend:** Next.js
- **Database:** Supabase
  - **Local:** Supabase CLI and Docker. From `app/`, run `npx supabase start`. Postgres is at `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. Studio is at `http://127.0.0.1:54323`.
  - **Production:** [hosted project](https://supabase.com/dashboard/project/mhmncmwxzkduyxfyrmyj)
- **Testing:** Vitest, in `app/`
- **CI/CD:** GitHub Actions
- **Frontend host:** Vercel

# Folder structure

```
app/                  Next.js application
  public/             Static files served by the app
  src/
    app/              Routes, layouts, and UI
    lib/              Server-side logic
    proxy.ts          Request auth session refresh
  supabase/           Local database config and migrations
Docs/                 Project notes
```

`app/src/app` is the interface: pages, layouts, and components. `app/src/lib` is server-only work: server actions, data access, and auth. A client component may import a server action from `lib`. Client-only code stays out of `lib`.

