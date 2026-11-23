<Title: what will be true when this is done>
<!-- Item: A change to make — an idea, a bug or a finding — in the shape an agent can pick up. -->

## Outcome

<!-- outcome, required: What will be true when this is done, in a sentence, and why if it is not obvious. It often makes the title. Keep the whole item to one screen. -->

## Acceptance criteria

<!-- criteria, required:
One line each: "When [trigger], [what can be seen]." or "If [error], then [result]."
Then how to check it — the command or page, a concrete input, what passes.
Three to seven, with an "If" where something can go wrong; more means split the item.
Add "Keep a test" only where a wrong answer would go unnoticed, and, in an App, "Add an e2e test" only for something a user must always be able to do, or for a fixed bug in how the parts fit together.
Example: 1. When a signed-in user requests /lists/42/export.csv, the app responds 200 with the header row name,added. Check: curl -i -b session.txt https://staging.example.com/lists/42/export.csv.
-->

## Out of scope

<!-- out-of-scope: What someone might expect this to change, but it does not. -->

## Where

<!-- where: The files or modules, if known. -->

## Steps to reproduce

<!-- repro: For a bug — the steps, what was expected, what happened. -->
