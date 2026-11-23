<!-- appspin-delivery: begin -->

## How we work

The appspin delivery standard is at `.agents/skills/appspin-delivery/standard.md`: read it before changing how anything here is built, reviewed or released.

These never vary:

- Minimal: the least code, tests and text that do the job — nothing unasked, no handling for a case that cannot happen, no abstraction for one use, nothing added to lines you did not change; leave what you touch smaller where you can.
- Code with superpowers, or the tool `.config/appspin/delivery.json`'s `roles.coding` names instead.
- Research and planning notes go where `roles.knowledge-base` names, or where the operator says; ask when it names no repository with a README.
- A document a person reads is written or edited with `appspin-write`.
- Write as if anyone may read the repository: nothing in it reveals the private details of another project, a customer, or a person, and examples use invented names such as `acme/demo`.
- The push hook, the pull request template, an App's deploy, promote, and staging workflows, and this section are the package's, rewritten by adopt: never edit them here; customizations go where the reference's Package pieces table says.
- After cloning, run the task runner's `setup` once: it turns the push hook on.
- In a trial whose end has not run, start each session by saying where it stands, as appspin-delivery's Guide a trial says.
- CI only calls the task runner; its logic lives in a script, where it runs locally too.
- At the end of a branch:
  1. For an App, run `e2e` on a local copy with the branch's migrations, if any, applied to its database, fix what the change broke, and record the result in **Seen**, or that the App cannot start locally. If a migration fails there, fix the file before the push and record it in **Seen**. If the copy reads a shared database, apply no migration to it without the operator's word, since others test against it: use the project's trial run of the migrations, if it has one, or record in **Seen** that they were not tried.
  2. Push the branch.
  3. Review it with `appspin-review`, or the tool `roles.review` names instead.
  4. Open the pull request on the operator's "approved".

  Never merge into `main` locally.

These are defaults; a project changes one by a line of its own outside this section:

- Name an item's branch its number and two or three words, such as `526-cf-tokens`.
- On a batch branch, each item is reviewed as it is built.
- Before a branch's push for review, or each batch item's, delete its designs and plans, and every test it added except those its acceptance criteria keep.

<!-- appspin-delivery: end -->
