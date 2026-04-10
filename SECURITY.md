# Security Policy

## Supported Versions

We currently support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The security of our users and their data is our top priority. If you discover a security vulnerability, we would appreciate it if you could report it to us privately so that we can address it before it is disclosed publicly.

To report a vulnerability, please email **security@marysthriftservices.com** with a detailed description of the issue, including steps to reproduce it if possible.

### What to include in your report:

- A clear description of the vulnerability.
- Proof of concept (PoC) or steps to reproduce.
- Potential impact of the vulnerability.
- Any suggested mitigations.

## Security Procedures

We take the following steps to ensure the security of this project:

1.  **Secrets Management**: We never commit sensitive keys, passwords, or tokens to version control. All secrets are managed via environment variables.
2.  **Authentication**: All sensitive administrative actions (like bulk data wipes) require authenticated session tokens with appropriate administrative privileges.
3.  **Regular Audits**: We perform periodic security audits of our codebase and dependencies to identify and fix potential vulnerabilities.
4.  **Backend Verification**: We enforce security checks at the server-side (Supabase Edge Functions) to ensure that even if the frontend is bypassed, the data remains protected.

## Disclosure Policy

We follow a policy of coordinated disclosure. We ask that you give us a reasonable amount of time to fix the issue before sharing it with others. In return, we will acknowledge your contribution and keep you updated on our progress.

Thank you for helping keep Mary's Thrift Finance secure!
