# ProdVerdict: A Simple Explanation

**ProdVerdict** is like a careful friend who checks your software before you let customers use it.  As developers start using AI assistants to write code, mistakes slip through more easily.  In fact, research shows that only **33 % of developers trust AI accuracy**【748400728082384†L83-L88】 and nearly **45 % of AI‑generated samples contain vulnerabilities**【50550606903651†L20-L27】.  That’s why ProdVerdict exists — it catches the big mistakes before they reach your users.

## What does ProdVerdict do?

Think of running a SaaS business like managing a busy restaurant.  Before you serve a dish, you want to be sure:

1. **The right people can eat it.**  If someone hasn’t paid for the meal, they shouldn’t be able to access it.  ProdVerdict checks that your billing system (like Stripe) and your app’s database agree on who has paid and who hasn’t.
2. **The kitchen stays safe.**  When you change your database (add a new column, create an index), you don’t want to lock the kitchen and stop all cooking.  ProdVerdict reviews database migrations to spot operations that could block reads or writes.
3. **The recipe ingredients are available.**  Your code might reference environment variables like `STRIPE_SECRET` or `DATABASE_URL`.  If those aren’t set in production or CI, your app will crash.  ProdVerdict finds missing or inconsistent configuration before deploy.
4. **The menu doesn’t leak secrets.**  Your API should never accept or return fields like `is_admin` or `password_hash` to untrusted users.  ProdVerdict tests endpoints to ensure they ignore or remove forbidden fields.
5. **Backups actually restore.**  Having a backup is one thing; knowing it works is another.  ProdVerdict can verify that your database backups restore correctly and that important tables contain data.

These checks are called **production contracts**.  A contract is a promise the system must uphold — for example, “paid users can access premium features.”  ProdVerdict encodes these promises in a configuration file and then verifies them every time you change your code.

## How does it work?

1. **Local checks:** You can run ProdVerdict from your laptop (`npx prodverdict check access`) to see if everything is still aligned.  It returns a simple report, telling you what passed and what failed.
2. **CI integration:** ProdVerdict integrates with GitHub Actions and other CI systems.  Each pull request is scanned automatically.  If a contract is broken, the PR fails and shows you what went wrong and how to fix it.
3. **Agent assistance:** AI coding agents like GitHub Copilot can call ProdVerdict using the Model Context Protocol (MCP) to verify their work before creating a pull request.  The same deterministic rules apply, ensuring consistency.
4. **Dashboard:** For teams, a lightweight dashboard stores the history of checks, lets you manage policies and adjust severity levels.  All sensitive data remains in your own systems; ProdVerdict only stores status and metadata.

## Why is this important?

AI tools help developers move faster, but they also introduce new risks.  A single missed billing event could let non‑paying users access your service, or a careless database migration could lock your users out.  With more than **150 million developers** on GitHub【376588004407349†L160-L169】 and AI becoming central to coding, the need for reliable safety nets grows.  ProdVerdict fills that gap by providing clear, enforceable rules about what “production ready” means.  Instead of trusting guesswork, you get a deterministic verdict on every change.

In short, ProdVerdict gives you confidence to ship quickly without breaking the things that matter most.