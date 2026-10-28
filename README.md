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

