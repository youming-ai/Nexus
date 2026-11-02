# Team preset

Visit `/team/` after signing in. Create an organization, switch between memberships, create a project, and invite members. Invitations use the same Cloudflare Email Service binding as account verification; accept the link while signed into the invited account.

Better Auth's organization plugin owns organizations, memberships and invitations. The default roles are `owner`, `admin`, and `member`.

- Owners and admins may create projects and read the team's audit events.
- Members may read their organization's projects.
- Every project and audit query checks membership on the server. URL parameters and client role checks are not trusted.
- Project creation and its audit event use one atomic D1 batch.
- Built-in organization management endpoints enforce Better Auth's role rules.

The example audit records cover project creation. This is not a compliance-grade audit of all authentication or membership changes, and no retention guarantee is provided. Adapt retention and organization deletion behavior to the product's requirements.

`src/features/team/team.server.ts` is the application authorization boundary. Keep all new tenant resources scoped to the organization and add cross-tenant tests. Do not rely on UI visibility for security.

The preset has no SSO, SCIM, billing, or external identity provider integration. The base README's database and email deployment setup still applies.
