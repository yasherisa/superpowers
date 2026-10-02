---
name: ship
description: Use when finished work has to reach production - deploy it, verify it live on every user path it touches, then commit and push only your own changes
---

# Ship

## Overview

A successful deploy is not done. Done is: deployed, verified live on the
paths users actually take, and pushed.

**Core principle:** Tests → Pre-deploy checks → Deploy → Verify live → Commit and push own files → Report.

**Announce at start:** "I'm using the ship skill to deploy, verify live, and push this work."

**When:** your human partner chose Ship in
superpowers:finishing-a-development-branch, or asked you to deploy.
Shipping touches production — it never starts on your own initiative.

**Where the specifics live:** targets, deploy commands, pre-deploy checks
and the user paths that must be exercised come from the project's deploy
checklist in CLAUDE.md, and from the plan if it names them. This skill is
the shape; the checklist is the content. If the project has no deploy
checklist, ask your human partner for the targets before deploying anything.

## Step 1: Run the Tests

Run the project's full suite on the tree you are about to deploy.

**If tests fail**, report the failures and stop — nothing ships red.

## Step 2: Pre-deploy Checks

- `git status --short` — files you did not change must not ride along. If
  the deploy ships the working tree rather than HEAD and someone else's
  uncommitted changes are in it, stop and ask.
- Run every pre-deploy check the project checklist names.
- If the change touches database schema or data, take a dump on the server
  first and note where it is.

## Step 3: Deploy

Deploy to every affected target the checklist lists — not only the one the
change was written for. Note what went where (target, version or commit).

## Step 4: Verify Live

Exercise every user path the change touches on the real deployment,
including the main path users enter through — not just the new code path.

- UI changes: take a screenshot and look at it (layout, colors, z-index).
- Web/PWA: confirm the service worker serves the new version (hard reload).
- Keep the evidence: command output, response bodies, screenshot paths.

**If a live check fails:** do not push and do not report done. Diagnose with
superpowers:systematic-debugging and fix, or roll back — rolling back is
your human partner's call.

## Step 5: Commit and Push

- Stage only the files you changed: `git add <paths>`, never `git add -A`
  or `git add .`.
- Commit anything of yours still uncommitted, then push.
- Never force-push. A rejected push means the remote moved — fetch,
  integrate your own commits, push again.

## Step 6: Report

Three lines, then whatever is still open:

```
Deployed: ✅/❌ <targets, version or commit>
Verified: ✅/❌ <paths exercised, where the evidence is>
Pushed:   ✅/❌ <branch, commit range>
Open:     <everything not verified, and why>
```

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "The deploy succeeded, so it works" | A green deploy proves the bits arrived. Only the live path proves the change works. |
| "I tested the new endpoint" | Users enter through the main path. Exercise that too. |
| "Tests passed earlier this session" | Run them on the tree you deploy. A green run only proves the tree it ran on. |
| "I'll push now and verify after" | Verify first. A pushed regression becomes everyone's problem. |
| "`git add -A` is faster" | Parallel sessions share this tree. You would commit their half-finished work. |
| "The push was rejected — force will fix it" | Never force. The remote moved; integrate it. |
| "I can't reach the page, the logs look fine" | That is not verified. Say what you could not check and why. |
