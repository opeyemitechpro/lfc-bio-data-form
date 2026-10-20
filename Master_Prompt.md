# MASTER BUILD PROMPT: LFC LADERIN-HILLTOP MEMBERSHIP BIO-DATA MANAGEMENT APPLICATION

## 1. Your Role

Act as a senior full-stack software architect, UI/UX designer, PostgreSQL database engineer, application security engineer, and DevOps engineer.

Design and implement a production-quality, mobile-first church membership bio-data capture and management application for **Living Faith Church International (Winners Chapel), Laderin-Hilltop, Ogun State, Nigeria**.

The application must be easy for elderly users, secure for administrative users, maintainable, extensible, accessible, and deployable entirely on free-tier services within their applicable limits.

Do not merely produce a mockup or static prototype. Build a functional application with a real PostgreSQL database, authentication, server-enforced permissions, image storage, CRUD operations, exports, and deployment documentation.

## 2. Project Objectives and Scope

The immediate objective is to capture members' personal information and passport photographs for church documentation.

The architecture must support future expansion into a comprehensive Church Membership Management System without requiring a complete rewrite.

For the initial release, implement:

- Public member bio-data registration.
- Secure administrative login.
- Member directory and individual member profiles.
- Member record creation, viewing, editing, and deletion according to permissions.
- Member photographs.
- Search, filters, pagination, and duplicate detection.
- User, role, permission, service-unit, and custom-field management.
- CSV, Excel, PDF, and print functionality.
- Individual and bulk member-card printing.
- Audit logging.
- Privacy notice and consent management.
- Responsive dashboard and accessible interfaces.

Do not implement tithes, offerings, attendance, cell-group administration, event management, pastoral counselling, or other full church-management modules yet. Keep the architecture extensible for these future features.

## 3. Mandatory Technology Stack

Use the following stack unless a documented technical incompatibility requires an alternative.

- Framework: Next.js App Router with TypeScript.
- Rendering: Server Components by default; Client Components only where interactive behaviour requires them.
- Hosting: Vercel Hobby plan.
- Database: Supabase PostgreSQL Free plan.
- Authentication: Supabase Auth.
- Database access: Supabase server-side client, PostgreSQL migrations, and secure server-side application operations.
- Styling: Tailwind CSS.
- UI components: shadcn/ui, using accessible component patterns.
- Forms: React Hook Form and Zod.
- Icons: Lucide React.
- Image storage: Cloudinary Free plan.
- CSV: a maintained CSV generation library or a safe native implementation.
- Excel: ExcelJS.
- PDF: a suitable server-compatible PDF generation library.
- Testing: Vitest or an equivalent unit-testing framework, plus Playwright for end-to-end testing.
- Version control: Git and GitHub-compatible deployment workflow.

Use maintained, mutually compatible stable package versions available at implementation time. Avoid unnecessary dependencies and avoid deprecated APIs.

Use npm unless the existing repository already specifies another package manager.

Keep all secrets in environment variables. Never commit secrets, service credentials, or private API keys.

## 4. Official Church Branding

Use the official logo provided here:

https://resources.faithtabernacle.org.ng/LFC_logo.png

Brand the application primarily as:

**Living Faith Church International — Laderin-Hilltop**

Include Winners Chapel International branding as a secondary identity where appropriate.

Branding requirements:

- Use the official church logo in the application header and login screen.
- Use an appropriate favicon derived from the supplied logo.
- Use church-appropriate colours consistent with the official logo.
- Maintain consistent branding across the public form, dashboard, login page, member cards, and printable reports.
- Keep the logo proportions intact.
- Provide sensible fallback branding if the remote logo is unavailable.
- Store a local, optimized copy of the logo in the project assets if licensing and asset retrieval permit.
- Do not invent official brand guidelines or substitute an unrelated logo.

Suggested page identity:

Living Faith Church International
Laderin-Hilltop
Membership Bio-Data Registration

## 5. Public Registration Form

Create a public registration page that can be opened by anyone who has the registration link.

The public registration page must not require an account or dashboard login.

Use a single-page form with clear visual grouping, responsive spacing, and a straightforward submission process. Avoid unnecessary multi-step navigation.

### Required fields

1. Title:
   - Select from options configured by the superadmin.
   - Initial suggested options: Brother, Sister, Deacon, Deaconess, Pastor, Pastor (Mrs.), Bishop, Apostle, Reverend, Elder, Other, No title.
   - Do not hard-code these as an immutable list.
   - Allow members to select their own title; title verification is not required.

2. Full name:
   - Required.
   - Use a single full-name field.
   - Normalize whitespace and validate length.

3. Gender:
   - Required.
   - Male or Female.

4. Age category:
   - Required.
   - Children: 1–10 years.
   - Youth: 11–20 years.
   - Adult: 21 years and above.
   - The user selects the category.
   - Do not collect a birth year or attempt to infer exact age.

5. Date of birth:
   - Day and month only.
   - Do not store the year.
   - Use an accessible date-selection interface or separate day and month selectors.
   - Handle February 29 sensibly without inventing a birth year.

6. Service units:
   - Allow multiple selections.
   - Populate options from an administrator-managed service-unit table.
   - Provide a clear "No Service Units Yet" option for members who do not belong to a unit.
   - If that option is selected, clear other service-unit selections.
   - Initial suggested units: Choir, Ushering, Sanctuary Keepers, Protocol, Children's Church, Media, Technical Unit, Hospitality, Prayer, Evangelism, and Others.
   - Allow administrators to add, rename, deactivate, and reorder units.
   - Deactivated units must not appear in new registrations but must remain visible on historical records where applicable.

7. Primary phone number:
   - Required.
   - Use a telephone input appropriate for Nigerian phone numbers.
   - Support country-code entry and normalization.
   - Do not reject valid international numbers unnecessarily.

8. WhatsApp number:
   - Optional.
   - Provide a checkbox or action to indicate that the primary phone number is also the WhatsApp number.

9. Additional phone numbers:
   - Optional.
   - Allow multiple numbers to be added or removed dynamically.

10. Email:
    - Optional.
    - Validate format.

11. Residential address:
    - Required unless the superadmin changes its required status through the custom-field/form configuration system.

12. Membership duration:
    - Required.
    - Dropdown options:
      - Less than 1 year
      - 1–3 years
      - 4–6 years
      - 7–10 years
      - Over 10 years

13. Suggestions/observations:
    - Optional multiline text area.
    - Explain that this field is for general church-related suggestions or observations.
    - Do not invite users to disclose highly sensitive personal information.

14. Passport photograph:
    - Support capturing a photograph using a compatible device camera.
    - Provide a separate option to select an existing image from the device.
    - Support image files only.
    - Accept JPEG, PNG, and WebP where supported.
    - Validate actual file content, not merely the filename or browser-provided MIME type.
    - Enforce a configurable maximum upload size.
    - Display a preview before submission.
    - Allow retaking, replacing, or removing the photograph before submission.
    - Optimize images for efficient storage and delivery.
    - Never accept executable files, arbitrary documents, or video files as passport photographs.

15. Privacy consent:
    - Display a clear privacy notice before submission.
    - Require explicit acknowledgement of the notice and consent to the collection and processing of personal information for church membership documentation.
    - For children, provide appropriate parent/guardian consent and collection safeguards.
    - Record the consent timestamp, notice version, and relevant consent status.
    - Do not claim that consent alone satisfies every applicable legal obligation.

16. Additional configurable fields:
    - Render active public custom fields configured by the superadmin.
    - Support required and optional fields.
    - Validate custom-field values on both client and server.

### Form behaviour

- Validate required fields and display clear inline errors.
- Preserve entered information when validation fails.
- Prevent duplicate submissions caused by repeated button clicks.
- Show a visible loading state during submission.
- Display an accessible success message after a successful registration.
- Provide a retry option after recoverable failures.
- Generate a unique member reference number.
- Do not expose database IDs, internal error messages, secrets, or stack traces unnecessarily.
- Make the registration form work on mobile devices with virtual keyboards and limited bandwidth.

## 6. Public Registration and Duplicate Detection

Save valid submissions immediately.

After saving a submission, check for possible duplicate members using normalized phone numbers, email where available, and other appropriate matching signals.

Do not automatically merge or delete potentially duplicated records.

Flag possible duplicates for authorized review.

Provide an administrator-facing duplicate-review interface that allows authorized users to:

- Inspect the matching records.
- Compare relevant fields.
- Confirm that the records belong to the same person.
- Mark records as distinct people.
- Resolve a duplicate using an explicit, audited action.

Prevent public users from searching for, viewing, or editing other members' records.

Implement rate limiting or equivalent abuse protection for public registration and image upload. Use CAPTCHA or another challenge mechanism if justified by abuse levels and the available free-tier services.

Use idempotency protection where practical.

## 7. Administrative Authentication

The dashboard must be accessible only to authenticated, active, administrator-approved accounts.

Do not provide public dashboard registration.

Implement secure login and logout, session management, password reset, and appropriate session expiry.

### Initial account provisioning

Create the initial superadmin through a secure, documented provisioning script or administrative bootstrap procedure.

- Read bootstrap credentials from protected environment variables or another secure provisioning mechanism.
- Do not hard-code a username or password in source code.
- Do not seed a default production password.
- Require the initial administrator to change any temporary password immediately.
- Ensure bootstrap is idempotent and cannot unintentionally create duplicate privileged accounts.
- Never expose the superadmin credentials through the browser.

For additional administrator accounts, the superadmin should be able to create an account, assign a temporary password, and activate or suspend it.

Require the new user to change the temporary password at first login.

Never store plaintext passwords in PostgreSQL application tables. Use the authentication provider's secure password-management mechanisms.

## 8. Hidden Superadmin Principal

The superadmin is a special system-level administrative principal, not an ordinary user group.

Requirements:

- It has unrestricted application-management authority.
- It can manage all members, roles, permissions, users, service units, custom fields, settings, exports, and audit records.
- It can activate, suspend, and manage other user accounts.
- It can recover access through a documented, secure administrative procedure.
- It is excluded from ordinary role/group listings.
- It is excluded from ordinary user directories and user-management results.
- It must not be assignable as an ordinary custom role.
- It must not be possible for an ordinary administrator to revoke, downgrade, or impersonate the superadmin.
- Its privileged status must be enforced by trusted server-side identity and authorization checks, not a client-supplied role name.
- Its privileged identity must not be exposed through public APIs or public registration responses.

Use a dedicated, immutable system-level privilege mechanism. Do not rely exclusively on a database field that ordinary role-management operations can modify.

The superadmin must still be able to access all administrative functions through the dashboard.

## 9. Role-Based Access Control

Implement granular, server-enforced Role-Based Access Control (RBAC).

### Initial roles

Provide the following configurable operational roles:

- Resident Pastor
- Technical Unit
- Viewer

The superadmin is separate and hidden as described above.

Allow the superadmin to create unlimited custom roles and assign users to one or more roles where appropriate.

A user may also have additional explicit permissions or restrictions if needed.

### Permission catalogue

Include permissions for:

- Dashboard access.
- View member records.
- Create member records.
- Edit member records.
- Delete member records.
- View photographs.
- Manage photographs.
- Export CSV.
- Export Excel.
- Export PDF.
- Print member tables.
- Print individual member cards.
- Print bulk member cards.
- View duplicate alerts.
- Resolve duplicates.
- Manage service units.
- Manage titles.
- Manage custom fields.
- Manage form settings.
- View audit logs.
- Manage ordinary users.
- Activate and suspend users.
- Manage roles and permissions.
- Manage application settings.

Keep permission definitions extensible.

### Authorization behaviour

- Deny access by default.
- Enforce permissions in every relevant server-side operation and API endpoint.
- Do not rely on hidden buttons or client-side checks for security.
- Prevent horizontal privilege escalation between users.
- Prevent ordinary roles from granting themselves additional privileges.
- Prevent users from changing fields outside their permissions.
- Restrict records by assigned group, service unit, or other configured scope when applicable.
- Apply restrictions consistently to member lists, record details, search results, exports, print operations, and API responses.
- Validate access again when an action is submitted, even if the interface previously displayed the action.
- Do not permit ordinary administrators to alter the hidden superadmin principal.

Build an interface where the superadmin can create a role, select granular permissions, assign users, and review the effective permissions.

## 10. Dashboard Layout

Create a polished administrative interface with a responsive sidebar or accessible mobile navigation.

Include:

- Overview/dashboard.
- Member directory.
- Register member.
- Duplicate review.
- Service-unit management.
- Title management.
- Custom-field management.
- User management.
- Role and permission management.
- Audit logs.
- Application settings.
- Account profile and password management.

Only display navigation items and actions permitted for the current user. Enforce the same permissions on the server.

### Dashboard statistics

Show useful aggregate statistics such as:

- Total registered members.
- Members by age category.
- Members by gender.
- Members by service unit.
- Members with and without photographs.
- Potential duplicate records awaiting review.
- Recently registered members.

Statistics must respect applicable data-access restrictions. Do not expose restricted records through aggregate counts if those counts would violate the user's assigned access scope.

Use clear charts only where they improve comprehension.

## 11. Member Directory

Create a primary member directory page displaying all records accessible to the logged-in user.

Support two views:

### A. Table view

Display:

- Passport thumbnail.
- Full name.
- Title.
- Gender.
- Age category.
- Primary phone.
- WhatsApp indicator where applicable.
- Email.
- Service units.
- Membership duration.
- Registration date.
- Available record actions.

Requirements:

- Bold, recognizable photographic thumbnails.
- Responsive layout.
- Pagination.
- Search.
- Sortable columns where useful.
- Filter by age category, gender, title, service unit, membership duration, registration date, and photograph availability.
- Combined filters.
- Clear filters action.
- Loading, empty, and error states.
- Permission-controlled record actions.

On small screens, use an accessible compact table or switch to a card/list layout. Do not force users to navigate a horizontally overflowing desktop table on a phone.

### B. Member-card view

Display attractive, colour-coordinated cards featuring:

- Passport photograph.
- Full name and title.
- Primary phone.
- WhatsApp contact where available.
- Email.
- Service units.
- Age category.
- Membership duration.
- Other fields explicitly configured for card display.

Provide actions for opening the full profile, editing where authorized, and printing where authorized.

Do not expose fields on cards merely because they exist in the database. Respect field visibility settings and user permissions.

## 12. Member Profile and Record Management

Provide a dedicated member profile page or accessible detail panel.

Organize information into clear sections:

- Personal information.
- Contact information.
- Church membership information.
- Photograph.
- Custom fields.
- Registration and modification metadata.

Support create, read, update, and delete operations according to permissions.

Use confirmation dialogs for destructive operations.

Use soft deletion or an equivalent recoverable deletion mechanism for member records where appropriate. Define how deleted records and associated images are retained or permanently removed.

Record who created and last modified each record, along with timestamps.

Where practical, provide a history of significant record changes.

Do not allow public users to access the profile page of a registered member.

## 13. Configurable Custom Fields

Implement a database-driven custom-field system. Do not hard-code every possible future field into the member table or React components.

The superadmin must be able to create, edit, reorder, activate, deactivate, and configure custom fields from the dashboard.

Initially support:

- Short text.
- Long text.
- Dropdown/select.
- Multi-select.
- Checkbox.
- Date where appropriate.
- Number.
- Email.
- Telephone.
- Yes/no.

Each field should support appropriate configuration, including:

- Internal field key.
- Display label.
- Field type.
- Help text.
- Required status.
- Validation rules.
- Default value where appropriate.
- Dropdown or multi-select options.
- Display order.
- Active/inactive status.
- Public-form visibility.
- Member-profile visibility.
- Member-card visibility.
- Table-column visibility.
- Export visibility.
- Whether the field is sensitive and requires additional permissions.

Allow field settings to be changed without redeploying the application.

Use a suitable normalized schema for field definitions and a JSONB or other carefully validated structure for custom-field values where appropriate.

Validate all custom-field definitions and submitted values on the server.

Do not permit executable expressions or arbitrary code to be entered as field configuration.

When a field is deactivated, preserve existing data. Deactivation must not silently delete historical values.

## 14. Exporting and Printing

Implement:

- CSV export.
- Excel (.xlsx) export.
- PDF report generation.
- Printable member table.
- Individual member-card printing.
- Bulk member-card printing.

All exports and print actions must respect:

- Current search query.
- Current filters.
- Current sorting where applicable.
- Selected records.
- The logged-in user's access scope.
- The user's export or print permissions.
- Configured field visibility.

### CSV and Excel

- Use meaningful column headings.
- Handle Unicode names and Nigerian phone numbers correctly.
- Prevent spreadsheet formula injection by sanitizing untrusted cell values.
- Provide a clear filename containing the report type and export date.

### PDF

Provide readable, properly paginated PDF reports with consistent church branding.

### Individual and bulk member cards

Create a print-friendly card design that includes the approved fields and photograph.

For bulk printing, support multiple cards per sheet where practical.

Avoid printing unnecessary dashboard navigation, buttons, or backgrounds.

Use sensible page breaks and avoid splitting a single card across pages.

### Export security

Perform export authorization and data retrieval on the server.

Do not rely on the browser to filter out unauthorized records.

Do not create permanent, publicly accessible export files containing personal information. If temporary files are necessary, protect them and expire them appropriately.

Log sensitive bulk-export operations.

## 15. Cloudinary Image Storage

Use Cloudinary Free for passport photographs.

Configure the integration with environment variables:

- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, if needed for client-side configuration.
- CLOUDINARY_API_KEY.
- CLOUDINARY_API_SECRET.
- Any additional required server-side configuration.

Only expose values that Cloudinary explicitly documents as safe for browser use. Never expose CLOUDINARY_API_SECRET.

Use a secure server-side upload-signing endpoint or equivalent secure upload mechanism.

Requirements:

- Authenticate and validate upload requests where necessary.
- For public registration, apply appropriate abuse protection before issuing upload authorization.
- Use a dedicated asset folder or namespace for LFC Laderin membership photographs.
- Generate unpredictable asset identifiers.
- Enforce allowed formats and maximum upload size.
- Validate image content, dimensions, and other relevant metadata.
- Prefer raster image formats and reject unsupported or malformed files.
- Apply reasonable image resizing, cropping, and compression.
- Use consistent transformations for thumbnails and member-card images.
- Save the Cloudinary public ID and relevant metadata in PostgreSQL.
- Avoid storing only an unvalidated client-supplied image URL.
- Implement cleanup for orphaned uploads when database persistence fails.
- Delete or decommission associated images when a record is permanently deleted, subject to retention policy.
- Ensure that replacing a photograph does not unintentionally delete another member's image.

### Photograph privacy

Treat member photographs as personal information.

Use restricted asset access or authenticated/signed image delivery where supported and appropriate. Do not assume that a non-guessable URL makes a public image private.

Ensure that public users cannot enumerate or retrieve other members' photographs through the application.

Do not render photographs from arbitrary user-supplied URLs.

Monitor Cloudinary storage, transformation, and delivery consumption. Keep image sizes and transformations efficient to conserve the free allocation.

## 16. PostgreSQL Database Design

Create version-controlled, repeatable database migrations.

Design a normalized relational schema that includes, at minimum, the following logical entities:

- Member records.
- Member phone numbers.
- Member service-unit assignments.
- Service units.
- Titles or configurable title options.
- User profiles.
- Role definitions.
- User-role assignments.
- Permission definitions.
- Role-permission assignments.
- Optional user-specific permission overrides.
- Access scopes or group assignments where needed.
- Custom-field definitions.
- Custom-field values.
- Registration consent records.
- Duplicate-review records.
- Audit events.
- Application settings.

Use appropriate UUID primary keys, foreign keys, unique constraints, indexes, timestamps, and check constraints.

Design a reliable member-reference-number generation mechanism that prevents collisions under concurrent submissions.

Use transactions for operations that must succeed or fail together.

Avoid excessive joins and unbounded queries on the member directory.

Use pagination and server-side filtering.

Keep authentication identities linked to application user profiles without duplicating plaintext credentials.

Document the relationships between tables.

Do not store photographs as binary objects in PostgreSQL.

Do not store a birth year.

## 17. Supabase Security and Database Access

Treat all client input as untrusted.

Implement Row Level Security (RLS) where direct client access is permitted. For operations routed exclusively through the server, enforce authorization in the server-side application and use appropriate database policies as defence in depth.

Requirements:

- Enable RLS on exposed tables.
- Write explicit policies for authorized access.
- Ensure public registration cannot read member directories or retrieve other members' records.
- Ensure public submissions can only create permitted records and cannot set privileged flags, roles, ownership, audit fields, or internal approval fields.
- Prevent ordinary authenticated users from bypassing server authorization through direct database/API access.
- Keep Supabase service-role credentials server-side only.
- Never expose privileged credentials in browser bundles or logs.
- Validate all IDs and relationships before performing operations.
- Protect user-management and permission-management operations against privilege escalation.

Document which operations use the public client, authenticated user context, and privileged server-side credentials.

## 18. Privacy, Consent, and Data Governance

Display a concise privacy notice on the public form and link to a full privacy policy.

The notice must explain:

- The church's identity as the organization collecting the information.
- The purpose of collecting member bio-data and photographs.
- The categories of information collected.
- How information will be used and accessed.
- How photographs will be handled.
- How long information will be retained or the applicable retention policy.
- How members can request access, correction, or deletion where applicable.
- How to contact the church about privacy concerns.
- Any relevant third-party service providers used for hosting, storage, or processing.

Use a consent checkbox that is unchecked by default.

Record the privacy-notice version and consent timestamp. Avoid recording unnecessary technical identifiers.

Provide suitable parental/guardian consent for registrations involving children, with appropriate safeguards.

Apply the Nigeria Data Protection Act 2023 and other applicable legal requirements as relevant. Do not present the generated privacy notice as a substitute for legal review.

Include a configurable retention policy and a documented data-deletion procedure.

Limit access to member information and avoid exposing personal information through application logs, error reports, analytics, or exported files.

## 19. Audit Logging

Create an audit trail for significant administrative activities.

At minimum, log:

- Member record creation.
- Member record modification.
- Member deletion or restoration.
- Photograph replacement or deletion.
- User creation and suspension.
- Role and permission changes.
- Custom-field configuration changes.
- Duplicate resolution.
- Bulk export and sensitive printing operations.
- Important application-setting changes.

Record the actor, action, relevant record reference, timestamp, and an appropriately minimized change summary.

Do not log passwords, authentication tokens, API secrets, or unnecessary personal data.

Ordinary users must not be able to alter or delete audit records through normal application operations.

## 20. Accessibility and Elderly-Friendly UI/UX

The application must prioritize ease of use for elderly members and administrators.

Use:

- Large, readable typography.
- High-contrast text and backgrounds.
- Large tap targets, preferably approximately 44–48 CSS pixels or larger.
- Clear labels above inputs.
- Large, recognizable buttons.
- Simple navigation.
- Adequate spacing between controls.
- Strong focus indicators.
- Accessible keyboard navigation.
- Visible error messages near the relevant fields.
- Clear success and failure feedback.
- Icons accompanied by labels where needed.
- Descriptive image-upload and camera buttons.
- Responsive layouts for phones, tablets, and desktops.
- Reduced-motion-friendly behaviour.

Avoid tiny text, faint grey labels, cluttered forms, excessive animation, hover-only controls, and complex navigation.

Use semantic HTML and appropriate ARIA attributes only where needed.

Ensure sufficient colour contrast and test accessibility with automated tools and manual keyboard navigation.

## 21. Performance and Reliability

- Use server-side pagination for large member lists.
- Optimize photographs and avoid loading full-resolution originals in directory views.
- Lazy-load photographs where appropriate.
- Avoid unnecessary client-side JavaScript.
- Use efficient database queries and indexes.
- Handle database and Cloudinary failures gracefully.
- Provide useful error messages without exposing implementation details.
- Avoid duplicate form submissions.
- Implement loading, empty, error, and success states consistently.
- Respect Vercel function execution limits and payload constraints.
- Avoid long-running jobs in request handlers.
- Do not introduce Redis, message queues, microservices, or external paid services unless a demonstrated requirement justifies them.

## 22. Free-Tier and Cost Controls

The initial deployment must use free plans for all external services.

Use:

- Vercel Hobby.
- Supabase Free.
- Cloudinary Free.

Do not require a paid email provider, paid CAPTCHA provider, paid monitoring service, or paid export API.

Use built-in capabilities or free alternatives when appropriate.

Account for the actual limits of each service, including:

- Database capacity.
- Storage.
- Image bandwidth and transformations.
- Function execution and request limits.
- Authentication quotas.
- Project inactivity or suspension policies.
- Backup and recovery limitations.

Do not assume that every service remains active indefinitely or that every overage is automatically blocked at zero cost.

Implement practical usage monitoring and document the limitations of the free deployment.

Do not claim that the application has guaranteed zero operating cost or unlimited capacity.

## 23. Environment Configuration

Provide a complete `.env.example` containing variable names and explanatory placeholders, never real secrets.

Include only the variables required by the chosen implementation, such as:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY or the current publishable-key equivalent
- SUPABASE_SERVICE_ROLE_KEY or the current secret-key equivalent
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- Secure initial-admin provisioning variables
- Application URL and any required authentication redirect configuration

Use current provider naming conventions where they differ.

Validate required environment variables at startup or during the relevant server operation.

Fail safely when mandatory secrets are missing.

Never commit `.env.local`, production credentials, or private key files.

## 24. Deployment and Operational Documentation

Provide a complete README with practical, step-by-step instructions for a developer deploying the application for the first time.

Include:

1. Required accounts.
2. Local prerequisites.
3. Repository setup.
4. Dependency installation.
5. Environment configuration.
6. Supabase project creation.
7. PostgreSQL migration execution.
8. RLS and policy configuration.
9. Supabase Auth configuration.
10. Cloudinary configuration and upload-signing setup.
11. Secure superadmin bootstrap.
12. Local development.
13. Automated tests.
14. GitHub integration.
15. Vercel deployment.
16. Environment variables in Vercel.
17. Authentication redirect configuration.
18. Production smoke testing.
19. Database backup/export procedures available on the selected free plan.
20. Photograph cleanup and retention procedures.
21. Recovery procedures if the database or image service is unavailable.
22. Troubleshooting common deployment errors.
23. Known free-tier limitations.
24. Upgrade path for future church-management modules.

Clearly distinguish local-development commands from production commands.

Do not instruct users to run destructive database commands against production without explicit warnings.

## 25. Testing and Acceptance Criteria

The application is not complete until the following are tested.

### Public form

- A visitor can open and submit the form without logging in.
- Required fields are validated on the client and server.
- Day/month-only DOB is preserved correctly.
- Multiple service units work.
- "No Service Units Yet" behaves correctly.
- Camera capture works on compatible devices over HTTPS.
- Image uploads reject invalid file types and oversized files.
- Privacy consent is required.
- Duplicate submissions are prevented where possible.
- A successful submission is stored in PostgreSQL.
- A failure does not falsely report success.

### Authentication and permissions

- An unauthenticated visitor cannot access the dashboard.
- Suspended users cannot continue accessing protected resources.
- Temporary passwords must be changed.
- A Viewer cannot edit or delete records without the required permissions.
- A role lacking export permission cannot export data through either the UI or a direct request.
- Unauthorized users cannot retrieve member records or images by guessing identifiers.
- Ordinary administrators cannot elevate their privileges.
- The hidden superadmin is excluded from ordinary role and user listings.
- The superadmin retains the intended administrative capabilities.

### Member management

- Member records can be created, viewed, and updated by authorized users.
- Deletion and restoration behave as documented.
- Service-unit changes do not corrupt historical membership assignments.
- Duplicate alerts and resolution are auditable.
- Search, filters, sorting, and pagination work together.

### Exports

- CSV, Excel, PDF, table printing, individual cards, and bulk cards work.
- Exports respect active filters, selections, permissions, and access scopes.
- Unauthorized fields are excluded.
- Spreadsheet formula injection is mitigated.
- Printed layouts are readable on paper.

### Security and privacy

- No secrets appear in browser bundles or Git history.
- Public registration cannot modify privileged application fields.
- RLS and server-side authorization are tested.
- Image-upload signing cannot be abused to upload arbitrary files.
- Audit logs do not expose credentials.
- Privacy consent and notice version are recorded.
- Child-registration safeguards work as specified.

### Deployment

- The application builds successfully on Vercel.
- Database migrations can be applied reproducibly.
- Production environment variables are documented.
- A production smoke test confirms login, registration, image upload, member viewing, and exports.
- No critical functionality depends on a local filesystem or a persistent application server.

## 26. Implementation Workflow

Work incrementally and keep the repository in a deployable state.

Phase 1: Architecture, project setup, branding, database schema, and migrations.

Phase 2: Public form, validation, consent, Cloudinary uploads, and database persistence.

Phase 3: Authentication, superadmin provisioning, RBAC, and secure dashboard access.

Phase 4: Member directory, profile views, editing, duplicate detection, and service-unit management.

Phase 5: Custom fields, user management, role permissions, and audit logging.

Phase 6: CSV, Excel, PDF, table printing, and member-card printing.

Phase 7: Accessibility, responsive design, security testing, and performance optimization.

Phase 8: Vercel deployment, documentation, and production verification.

After each phase, run the relevant tests and fix failures before proceeding.

Before implementing the database schema, present the proposed architecture, ER diagram, key security decisions, and migration plan. Then continue implementation without waiting for approval unless an essential decision is missing.

Do not stop after presenting plans, mockups, or pseudocode. Implement the actual application and verify its functionality.

## 27. Final Deliverables

Deliver:

- A complete, working Next.js application.
- PostgreSQL migrations and schema documentation.
- Seed data for configurable titles and service units.
- Secure superadmin provisioning procedure.
- Functional RBAC implementation.
- Public registration page.
- Administrative dashboard.
- Member directory and profiles.
- Cloudinary integration.
- Configurable custom fields.
- Duplicate detection and review.
- CSV, XLSX, PDF, and printing features.
- Audit logging.
- Privacy notice and consent flow.
- Automated tests.
- `.env.example`.
- Complete README and deployment guide.
- A list of implemented features, tests performed, known limitations, and any remaining manual configuration.

Never claim a feature is complete merely because its UI exists. Verify that the database operations, permissions, validation, and user workflows work end to end.

**Final priority:** deliver a secure, easy-to-use, attractive church bio-data application that captures member information and photographs reliably on mobile devices, operates within free-tier constraints, and provides a maintainable foundation for future church membership management.
