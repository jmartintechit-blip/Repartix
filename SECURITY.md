# Security policy

Repartix is a portfolio project, not a hosted service. There is no public deployment and no real user data. Reports are still welcome.

## Reporting a vulnerability

Please do not describe a vulnerability in a public issue.

- Use GitHub's private reporting: **Security** tab, then **Report a vulnerability**.
- If that button is not available, open an issue that only says you have a security report and asks for a private channel. Leave out the details.

You can expect a first answer within a week. There is no bounty.

## Supported versions

Only the latest release and the `main` branch receive fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## What is not a bug

- The known limitations listed in the [README](README.md#known-limitations), for example the missing security headers or the token kept in `localStorage`.
- Permissive CORS when `FRONTEND_URL` is not set. That is the documented development default; production deployments are expected to set it.
- Findings that need a leaked `.env` file or a weak `JWT_SECRET` chosen by the person running the app.
- Denial of service by sheer volume, and the free-tier limits of third-party services (Gemini, Cloudinary, Railway, Vercel).
- Social engineering.

## Scope

In scope: the code in this repository. Dependency advisories are tracked with Dependabot.
