# Subject-Based Lessons & Study Groups System

Implement a comprehensive subject, lesson, and group system, extending the existing smart learning core.

## Proposed Changes

### Database (Supabase)
Create a new migration `019_groups_and_lessons.sql` to extend existing tables and add new ones:
- **`study_groups` changes**: Add `subject` (text), `is_public` (boolean, default true), `cover_image` (text).
- **`group_join_requests`**: Table for private group join requests. (`group_id`, `user_id`, `status`).
- **`group_materials`**: Link table allowing students to share their personal `learning_materials` to a group. (`group_id`, `material_id`, `shared_by`).
- **`group_posts`**: Table for group discussions. (`group_id`, `user_id`, `content`, `created_at`).
- **RLS Policies**: Secure private groups so non-members cannot read `group_materials` or `group_posts`. Secure `group_join_requests` so only group admins can manage them.

### Backend APIs (`api/server.js` or frontend direct Supabase calls)
- All logic will be implemented in the frontend using Supabase JS client to minimize serverless overhead and maintain real-time capabilities.

### Frontend Components

#### 1. My Subjects (`frontend/js/subjects.js` & `frontend/subjects.html`)
- **[NEW]** `subjects.html`: A page listing a student's personal subjects (from `public.subjects`).
- **[NEW]** `subject-details.html`: Shows lessons, notes, and related groups for a specific subject.

#### 2. Lessons (`frontend/js/lessons.js` & `frontend/lessons.html`)
- **[MODIFY]** `lessons.html`: Update UI to show search, subject filter, and "My Uploads" vs "Shared Materials".
- **[MODIFY]** `lessons.js`: Add material upload flow (select subject, title, file, publish). Add ability to share an uploaded material to a joined group.

#### 3. Groups (`frontend/js/groups.js` & `frontend/groups.html`, `frontend/group-details.html`)
- **[NEW]** `groups.html`: "Discover Groups" and "My Groups" tabs. "Create Group" button.
- **[NEW]** `group-details.html`: Header (name, subject, members, public/private). Tabs: Overview, Members, Lessons, Materials, Discussion.
- **[NEW]** `groups.js`: 
  - Fetch groups (filtered by subject/public).
  - Join public groups instantly.
  - Request to join private groups.
  - Admin view: Approve requests, manage members.
  - Discussion: Post messages to `group_posts`.
  - Materials: View materials shared to the group.

#### 4. Navigation & Layout
- **[MODIFY]** `dashboard.html` / `app.js`: Ensure sidebar has "My Subjects", "Lessons", and "Groups".
- **[MODIFY]** `dashboard.css`: Add styles for group cards, tabs, and subject icons.

## Open Questions
- Do we need a central catalog of subjects (e.g. predefined list of subjects to pick from), or can students freely type subject names when creating them? (Assuming free text but categorized for now).

## Verification Plan
1. Create a subject (Mathematics).
2. Upload a material to Mathematics.
3. Create a Private Group (Mathematics).
4. Invite another student (or simulate request/approval).
5. Share the material to the Group.
6. Verify RLS prevents unauthorized access to the shared material.
